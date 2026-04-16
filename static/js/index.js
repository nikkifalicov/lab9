const width = 500;
const height = 500;
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const innerwidth = width - margin.left - margin.right;
const innerheight = height - margin.top - margin.bottom;

let svg = d3
  .select("svg#scatterplot")
  .attr("width", 500)
  .attr("height", 500)
  .style("background", "#eee");

let plotg = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
let xAxisG = plotg.append("g").attr("transform", `translate(0,${innerheight})`);
let yAxisG = plotg.append("g");
let pointsG = plotg.append("g");
let centroidsG = plotg.append("g");

let xScale = d3.scaleLinear().range([0, innerwidth]);
let yScale = d3.scaleLinear().range([innerheight, 0]);

load_and_plot('digits')

function load_and_plot(filename) {
  d3.csv(`static/datasets${filename}.csv`, d3.autoType).then((data) => {
    
    svg.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("r", 5)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .style("fill", "#69b3a2");

    xScale.domain(d3.extent(data, d => d.x)).range([0, innerwidth]);
    yScale = d3.scaleLinear().domain(d3.extent(data, d => d.y)).range([0, innerheight]);
    xAxisG.call(d3.axisBottom(xScale));
    yAxisG.call(d3.axisLeft(yScale));

  });

  
}

// utilities
async function post(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST", // Specify the method (POST)
    headers: {
      "Content-Type": "application/json", // Tell the server you're sending JSON
    },
    body: JSON.stringify(data), // Convert JS object to JSON string
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`); // Check for errors
  }
  return await response.json(); // Parse the JSON response
}

function example_use_of_post() {
  post("your_route", {data: "aabbccc"}).then((returned_data) => {
    console.log("server says", returned_data);
  });
}