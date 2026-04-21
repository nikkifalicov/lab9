const width = 620;
const height = 420;
const margin = { top: 20, right: 20, bottom: 40, left: 45 };
const innerwidth = width - margin.left - margin.right;
const innerheight = height - margin.top - margin.bottom;

let svg = d3
  .select("svg#main")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#e9e9e9");

let plotg = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
let xAxisG = plotg.append("g").attr("transform", `translate(0,${innerheight})`);
let yAxisG = plotg.append("g");
let pointsG = plotg.append("g");

let xScale = d3.scaleLinear().range([0, innerwidth]);
let yScale = d3.scaleLinear().range([innerheight, 0]);

function syncParamInputs(value) {
  d3.select("#param").property("value", value);
  d3.select("#param-number").property("value", value);
}

function update_ui(value = undefined) {
  let mode = d3.select("#mode").node().value;

  if (mode === "k-nearest-neighbor") {
    let k = value !== undefined ? Math.round(+value) : 7;

    d3.select("#param")
      .attr("min", 3)
      .attr("max", 50)
      .attr("step", 1);

    d3.select("#param-number")
      .attr("min", 3)
      .attr("max", 50)
      .attr("step", 1);

    syncParamInputs(k);
    d3.select("#label-for-param").text("K");
  } else {
    let r = value !== undefined ? +value : 7;

    d3.select("#param")
      .attr("min", 1)
      .attr("max", 20)
      .attr("step", 0.5);

    d3.select("#param-number")
      .attr("min", 1)
      .attr("max", 20)
      .attr("step", 0.5);

    syncParamInputs(r);
    d3.select("#label-for-param").text("R");
  }
}

function getColorValues(data, datasetName) {
  if (datasetName === "digits") {
    return data.map((row, i) => i);
  }
  return data.map((row) => row[0]);
}

function drawOriginal3D(data, colorValues) {
  const x = data.map(d => d[0]);
  const y = data.map(d => d[1]);
  const z = data.map(d => d[2] ?? 0);

  const zmin = Math.min(...z);
  const zmax = Math.max(...z);

  const trace = {
    x: x,
    y: y,
    z: z,
    type: "scatter3d",
    mode: "markers",
    hoverinfo: "x+y+z",
    marker: {
      size: 5,
      color: colorValues,
      colorscale: "Viridis",
      opacity: 0.9
    }
  };

  const layout = {
    margin: { l: 0, r: 0, b: 0, t: 0 },
    paper_bgcolor: "#e9e9e9",
    scene: {
      bgcolor: "#e9e9e9",
      aspectmode: "cube",
      camera: {
        eye: { x: 1.5, y: 1.5, z: 0.9 }
      },
      xaxis: {
        showbackground: true,
        backgroundcolor: "#e9e9e9",
        gridcolor: "#ffffff",
        zerolinecolor: "#cccccc",
        color: "#666666"
      },
      yaxis: {
        showbackground: true,
        backgroundcolor: "#e9e9e9",
        gridcolor: "#ffffff",
        zerolinecolor: "#cccccc",
        color: "#666666"
      },
      zaxis: {
        showbackground: true,
        backgroundcolor: "#e9e9e9",
        gridcolor: "#ffffff",
        zerolinecolor: "#cccccc",
        color: "#666666"
      }
    }
  };

  Plotly.purge("original3d");
  Plotly.react("original3d", [trace], layout, {
    displayModeBar: false,
    responsive: true
  });
}

function drawEmbedding2D(xy, colorValues) {
  const plotData = xy.map((d, i) => ({
    x: d[0],
    y: d[1],
    c: colorValues[i]
  }));

  xScale.domain(d3.extent(plotData, d => d.x)).nice();
  yScale.domain(d3.extent(plotData, d => d.y)).nice();

  xAxisG.call(d3.axisBottom(xScale));
  yAxisG.call(d3.axisLeft(yScale));

  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain(d3.extent(plotData, d => d.c));

  pointsG
    .selectAll("circle")
    .data(plotData)
    .join("circle")
    .attr("r", 4)
    .attr("cx", d => xScale(d.x))
    .attr("cy", d => yScale(d.y))
    .style("fill", d => colorScale(d.c))
    .style("opacity", 0.8)
    .style("stroke", "white")
    .style("stroke-width", 0.3);
}

function load_and_plot(filename) {
  d3.json(`static/datasets/${filename}.json`).then((loaded) => {
    const data = loaded.data;
    const mode = d3.select("#mode").node().value;
    const param = +d3.select("#param").node().value;

    const colorValues = getColorValues(data, filename);
    drawOriginal3D(data, colorValues);

    let payload = { data: data };
    if (mode === "k-nearest-neighbor") {
      payload.k = Math.round(param);
    } else {
      payload.r = param;
    }

    post("/isomap", payload).then((xy) => {
      drawEmbedding2D(xy, colorValues);
    }).catch((err) => {
      console.error("POST /isomap failed:", err);
    });
  }).catch((err) => {
    console.error("JSON load failed:", err);
  });
}

async function post(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

update_ui();

d3.select("#mode").on("change", () => {
  update_ui();
});

d3.select("#param").on("input", () => {
  update_ui(d3.select("#param").node().value);
});

d3.select("#param-number").on("input", () => {
  update_ui(d3.select("#param-number").node().value);
});

d3.select("#submit").on("click", () => {
  load_and_plot(d3.select("#dataset").node().value);
});

load_and_plot(d3.select("#dataset").node().value);