const studentColorScale = d3.scaleOrdinal(d3.schemeCategory10);
// Tooltip div
const tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("padding", "6px")
  .style("background-color", "white")
  .style("border", "1px solid #ddd")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("opacity", 0);



function loadAndPlot() {
    const exam = document.getElementById("examType").value;
    const inputHR = parseFloat(document.getElementById("avgHR").value);
    const inputTemp = parseFloat(document.getElementById("avgTemp").value);

    document.getElementById("hrValue").textContent = inputHR;
    document.getElementById("tempValue").textContent = inputTemp;

    Promise.all([
        d3.csv(`data/${exam}_averages.csv`),
        d3.csv(`data/${exam}_combined.csv`),
        d3.csv("data/Student_Grades.csv"),
        d3.csv(`data/mean_${exam}_hr.csv`),
        d3.csv(`data/mean_${exam}_temp.csv`)
    ]).then(([averages, combined, grades, average_hr, average_temp]) => {
        // Find closest student using Euclidean distance
        let closest = averages.reduce((best, current) => {
        const dist = Math.hypot(
            current["Average Heart Rate"] - inputHR,
            current["Average Temperature"] - inputTemp
        );
        return dist < best.dist ? { student: current.Student, dist } : best;
        }, { student: null, dist: Infinity }).student;

        // Get exam score
        const studentRow = grades.find(d => d.Student === closest);
        console.log(studentRow)
        const examLabel = {
        midterm1: "Midterm 1 Score",
        midterm2: "Midterm 2 Score",
        final: "Final Score"
        };
        const score = studentRow ? studentRow[examLabel[exam]] : "N/A";

        // Display selected student and score
        document.getElementById("selectedStudentTitle").textContent =
        `Closest Student: ${closest} | ${examLabel[exam]}: ${score}`;

        const studentColor = studentColorScale(closest);

        // Prepare data for plotting
        const studentData = combined.filter(d => d.Student === closest);
        studentData.forEach(d => {
        d.Time = d3.timeParse("%H:%M:%S")(d.Time);
        d["Heart Rate"] = +d["Heart Rate"];
        d.Temperature = +d.Temperature;
        });

        // Parse mean data (important!)
        average_hr.forEach(d => {
          d.Time = d3.timeParse("%H:%M:%S")(d.Time);
          d["Heart Rate"] = +d["Heart Rate"];
        });
        average_temp.forEach(d => {
          d.Time = d3.timeParse("%H:%M:%S")(d.Time);
          d.Temperature = +d.Temperature;
        });

        // Existing call — now pass meanData as last argument
        drawHRLineChart(studentData, "Time", "Heart Rate", "#hrChart", "Heart Rate (bpm)", average_hr, studentColor);
        drawTempLineChart(studentData, "Time", "Temperature", "#tempChart", "Temperature (°C)", average_temp, studentColor);

// Slider logic (inside loadAndPlot after drawing charts)
const slider = document.getElementById("timeSlider");
slider.max = studentData.length - 1;
slider.value = 0;

slider.oninput = function () {
  const idx = +this.value;
  const selectedHRData = studentData[idx];
  const selectedTempData = studentData[idx];

  const svgHR = d3.select("#hrChart");
  const svgTemp = d3.select("#tempChart");

  const svgRectHR = svgHR.node().getBoundingClientRect();
  const margin = { top: 20, right: 30, bottom: 30, left: 60 };
  const width = svgHR.attr("width") - margin.left - margin.right;
  const height = svgHR.attr("height") - margin.top - margin.bottom;

  const xScale = d3.scaleTime()
    .domain(d3.extent(studentData, d => d.Time))
    .range([0, width]);

  const timeX = xScale(selectedHRData.Time);

  // Tooltip (centered over line)
  tooltip.transition().duration(100).style("opacity", 0.95);
  tooltip.html(`
    <strong>Time:</strong> ${d3.timeFormat("%H:%M")(selectedHRData.Time)}<br>
    <strong>Heart Rate (bpm):</strong> ${selectedHRData["Heart Rate"].toFixed(2)}<br>
    <strong>Temperature (°C):</strong> ${selectedTempData.Temperature.toFixed(2)}
  `)
    .style("left", `${svgRectHR.left + margin.left + timeX - tooltip.node().offsetWidth / 2}px`)
    .style("top", `${svgRectHR.top + margin.top}px`);

  // HR hover line
  svgHR.select(".hover-line")
    .attr("x1", margin.left + timeX)
    .attr("x2", margin.left + timeX)
    .style("opacity", 1);

  // Temp hover line
  svgTemp.select(".hover-line")
    .attr("x1", margin.left + timeX)
    .attr("x2", margin.left + timeX)
    .style("opacity", 1);
};

    });
  }
  
  function drawHRLineChart(data, xKey, yKey, svgSelector, yLabel, meanData, studentColor) {
    const svg = d3.select(svgSelector);
    svg.selectAll("*").remove();
  
    const margin = { top: 20, right: 30, bottom: 30, left: 60 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleTime()
                .domain(d3.extent(data, d => d[xKey]))
                .range([0, width]);
  
    const y = d3.scaleLinear()
                .domain([50, 192])
                .range([height, 0]);
  
    const line = d3.line()
                   .x(d => x(d[xKey]))
                   .y(d => y(d[yKey]));
  
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));
  
    g.append("g").call(d3.axisLeft(y));
  
    // Student line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", studentColor)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Mean line
    g.append("path")
      .datum(meanData)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", line);

      const hoverLine = g.append("line")
      .attr("class", "hover-line")    
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("y1", 0)
      .attr("y2", height)
      .style("opacity", 0);
    
     
  g.selectAll("circle")
 .data(data)
 .enter()
 .append("circle")
 .attr("cx", d => x(d[xKey]))
 .attr("cy", d => y(d[yKey]))
 .attr("r", 3)
 .attr("fill", studentColor)
 .on("mouseover", function(event, d) {
    tooltip.transition().duration(200).style("opacity", 0.9);
    tooltip.html(`
      <strong>Time:</strong> ${d3.timeFormat("%H:%M")(d[xKey])}<br>
      <strong>${yLabel}:</strong> ${d[yKey]}
    `)
    .style("left", `${event.pageX + 10}px`)
    .style("top", `${event.pageY - 28}px`);
    hoverLine
      .attr("x1", x(d[xKey]))
      .attr("x2", x(d[xKey]))
      .style("opacity", 1);
  })
 .on("mouseout", function() {
    tooltip.transition().duration(200).style("opacity", 0);
    hoverLine.style("opacity", 0);
 });

  
    g.append("text")
     .attr("x", -margin.left + 10)
     .attr("y", -5)
     .attr("font-weight", "bold")
     .text(yLabel);

    // Add legend
    const legend = g.append("g")
                    .attr("transform", `translate(${width - 150}, 10)`);

    // Student line
    legend.append("line")
      .attr("x1", 0).attr("x2", 20)
      .attr("y1", 0).attr("y2", 0)
      .attr("stroke", studentColor)
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 5)
      .text("Selected Student")
      .style("font-size", "12px");

    // Mean line
    legend.append("line")
      .attr("x1", 0).attr("x2", 20)
      .attr("y1", 20).attr("y2", 20)
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    legend.append("text")
      .attr("x", 25)
      .attr("y", 25)
      .text("Exam Mean")
      .style("font-size", "12px");

  }

  function drawTempLineChart(data, xKey, yKey, svgSelector, yLabel, meanData, studentColor) {
    const svg = d3.select(svgSelector);
    svg.selectAll("*").remove();
  
    const margin = { top: 20, right: 30, bottom: 30, left: 60 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleTime()
                .domain(d3.extent(data, d => d[xKey]))
                .range([0, width]);
  
    const y = d3.scaleLinear()
                .domain([20, 39])
                .range([height, 0]);
  
    const line = d3.line()
                   .x(d => x(d[xKey]))
                   .y(d => y(d[yKey]));
  
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")));
  
    g.append("g").call(d3.axisLeft(y));
  
    // Student line
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", studentColor)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Mean line
    g.append("path")
      .datum(meanData)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("d", line);

      const hoverLine = g.append("line")
  .attr("class", "hover-line")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("y1", 0)
      .attr("y2", height)
      .style("opacity", 0);
    
    g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d[xKey]))
      .attr("cy", d => y(d[yKey]))
      .attr("r", 3)
      .attr("fill", studentColor)
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`
          <strong>Time:</strong> ${d3.timeFormat("%H:%M")(d[xKey])}<br>
          <strong>${yLabel}:</strong> ${d[yKey]}
        `)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    
        hoverLineTemp
          .attr("x1", x(d[xKey]))
          .attr("x2", x(d[xKey]))
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
        hoverLineTemp.style("opacity", 0);
      });
    
  
    g.append("text")
     .attr("x", -margin.left + 10)
     .attr("y", -5)
     .attr("font-weight", "bold")
     .text(yLabel);

    // Add legend
    const legend = g.append("g")
                    .attr("transform", `translate(${width - 150}, 10)`);

    // Student line
    legend.append("line")
      .attr("x1", 0).attr("x2", 20)
      .attr("y1", 0).attr("y2", 0)
      .attr("stroke", studentColor)
      .attr("stroke-width", 2);

    legend.append("text")
      .attr("x", 25)
      .attr("y", 5)
      .text("Selected Student")
      .style("font-size", "12px");

    // Mean line
    legend.append("line")
      .attr("x1", 0).attr("x2", 20)
      .attr("y1", 20).attr("y2", 20)
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    legend.append("text")
      .attr("x", 25)
      .attr("y", 25)
      .text("Exam Mean")
      .style("font-size", "12px");
  }
  
  // Update slider labels in real time
  document.getElementById("avgHR").addEventListener("input", e => {
    document.getElementById("hrValue").textContent = e.target.value;
  });
  document.getElementById("avgTemp").addEventListener("input", e => {
    document.getElementById("tempValue").textContent = e.target.value;
  });
  