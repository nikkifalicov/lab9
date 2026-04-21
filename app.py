import json

import numpy as np
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from sklearn.manifold import Isomap
from sklearn.metrics import euclidean_distances
from scipy.sparse.csgraph import shortest_path

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


def euclidean_pairwise_distance(data):
    return euclidean_distances(data, data)


def compute_graph(data, k=15, r=None):
    """
    Build the Isomap neighborhood graph.

    If r is provided, use r-ball neighborhoods.
    Otherwise use k-nearest neighbors.
    """
    n = data.shape[0]
    pairwise_dist = euclidean_pairwise_distance(data)
    graph_adj_matrix = np.zeros((n, n), dtype=float)

    if r is not None:
        # Connect points within radius r, excluding self-connections.
        mask = (pairwise_dist <= r) & (pairwise_dist > 0)
        graph_adj_matrix[mask] = pairwise_dist[mask]
    else:
        if k is None:
            k = 15
        k = max(1, min(int(k), n - 1))

        for i in range(n):
            # First index is the point itself (distance 0), so skip it.
            neighbor_idx = np.argsort(pairwise_dist[i])[1 : k + 1]
            graph_adj_matrix[i, neighbor_idx] = pairwise_dist[i, neighbor_idx]

        # Make the graph undirected/symmetric.
        graph_adj_matrix = np.maximum(graph_adj_matrix, graph_adj_matrix.T)

    return graph_adj_matrix


def classical_mds(pdist, n_components=2):
    n = pdist.shape[0]
    h = np.eye(n) - np.ones((n, n)) / n
    sim = -0.5 * h @ (pdist ** 2) @ h

    try:
        U, S, _ = np.linalg.svd(sim)
        xy = U[:, :n_components] * np.sqrt(S[:n_components])
    except np.linalg.LinAlgError:
        xy = np.random.randn(n, n_components)

    return xy


def isomap(data, k=15, r=None, n_components=2):
    graph_adj_matrix = compute_graph(data, k=k, r=r)
    shortest_path_distance = shortest_path(graph_adj_matrix, directed=False)
    xy = classical_mds(shortest_path_distance, n_components=n_components)
    return xy

@app.route("/isomap", methods=["POST"])
def compute_isomap():
    req = request.get_json()
    data = np.array(req["data"])

    if "k" in req:
        xy = isomap(data, k=req["k"], r=None)
    elif "r" in req:
        xy = isomap(data, r=req["r"], k=None)
    else:
        xy = isomap(data)

    return jsonify(xy.tolist())

if __name__ == "__main__":
    app.run(port=5001)
