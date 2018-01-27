var w = 1000;
var h = 600;
var count = 30;
var fill = d3.scaleOrdinal(d3.schemeCategory10);
var simulation;

var groupNum = 9;
var groups = [];

groups.init = function() {
  var polygonSize = 10;

  groups.r = w / (groupNum + 1) / 3;
  for (i = 0; i < groupNum; i++) {
    var g = [];
    g.groupId = i;
    g.x = (i+1) * w / (groupNum + 1);
    g.y = h / 2;

    for (j = 0; j < polygonSize; j++) {
      var alpha = (2 * Math.PI * j / polygonSize);
      g.push({
        x: g.x + groups.r * Math.sin(alpha),
        y: g.y + groups.r * Math.cos(alpha)
      });
    }
    groups[i] = g;
  };
}

// groups.snap = function(d) {
//   function change(d, to) {
//     if (d.groupId != null) {
//       var oldGroup = groups[d.groupId];
//       var index = oldGroup.indexOf(d);
//       if (index >= 0) {
//         oldGroup.splice(index, 1);
//       }
//     }
//
//     if (to == null) {
//       d.groupId = null;
//     } else {
//       d.groupId = to.groupId;
//       to.push(d);
//     }
//   }
//
//   groups.forEach(function(g) {
//     var distance = Math.sqrt(Math.pow(d.x - g.x, 2) + Math.pow(d.y - g.y, 2));
//     if (distance < groups.r) {
//       if (d.groupId != g.groupId) {
//         change(d, g);
//       }
//     } else {
//       if (d.groupId == g.groupId) {
//         change(d, null)
//       }
//     }
//   });
// }

groups.delta = function(d) {
  function massCenter(g) {
    var x = 0,
      y = 0;
    g.forEach(function(e) {
      x += e.x;
      y += e.y;
    });
    return {
      x: x / g.length,
      y: y / g.length
    };
  }

  if (d.groupId == null) return 0;
  var g = groups[d.groupId];
  var massCenter = massCenter(g);
  var delta = {
    x: g.x - massCenter.x,
    y: g.y - massCenter.y
  }
  return delta;
}

function dragsubject() {
  return simulation.find(d3.event.x, d3.event.y);
}
function dragstarted() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}
function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}
function dragended() {
  if (!d3.event.active) simulation.alphaTarget(0);
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}

function stringToArray(s) {
  if(Array.isArray(s)) {
    return s;
  } else if(isNaN(s)) {
    return s.split(",").map(function(a) { return +a.trim(); });
  } else {
    return [s];
  }
}

//tooltips
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.json("all.json", function(error, data) {
  //data preparation
  groups.init();
  var nodes = [];

  function addAllToNodes(array, groupId) {
    array.forEach(function(text, index) {
      node = {
        text: text,
        groupId: groupId,
        groupIndex: index,
        x: w / (groupNum + 1) * (groupId + 1),
        y: h / 2,
        highlight: false
      };
      nodes.push(node);
      groups[groupId].push(node);
    });
  }
  data.forEach(function(row, index) {
    row.type = stringToArray(row.type);
    row.role = stringToArray(row.role);

    row.strategy = stringToArray(row.strategy);
    row.result = stringToArray(row.result);
    row.person = stringToArray(row.person);
    row.area = stringToArray(row.area);
    row.school = stringToArray(row.school);
    row.relation = stringToArray(row.relation);

    data[index] = row;
  });
  addAllToNodes(data, 0);
  addAllToNodes(types, 1);
  addAllToNodes(roles, 2);
  addAllToNodes(strategies, 3);
  addAllToNodes(results, 4);
  addAllToNodes(people, 5);
  addAllToNodes(areas, 6);

  addAllToNodes(relations, 8);

  //main vis + nodes
  var vis = d3.select("#chart").append("svg")
    .attr("width", w)
    .attr("height", h);

  var nodeFill = function(n) {
    return n.groupId != null ? fill(n.groupId) : "lightgray";
  };

  function highlightRelated(d, field, fieldId, isArrayIndex) {
    if (d.text[field]) {
      d.text[field].forEach(function(t) {
        var count = 0;
        for (var j = 0; j < nodes.length; j++) {
          if (nodes[j].groupId === fieldId) {
            if (count === t - (isArrayIndex? 1:0)) {
              nodes[j].highlight = true;
              groupj = groups[nodes[j].groupId];
              groupj.splice(groupj.indexOf(nodes[j]), 1);
              break;
            } else {
              count++;
            }
          }
        }
      });
    }
  }

  var node = vis.selectAll(".node")
      .data(nodes)
    .enter().append("path")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .attr("d", d3.symbol()
        .size(150)
        .type(function(d) { return d3.symbols[d.groupId % d3.symbols.length]; }))
      .style("fill", nodeFill)
      .style("stroke", function() { return d3.rgb(nodeFill).darker(2); })
      .style("stroke-width", function(d) { return d.highlight? 1.5:0 })
      .on("mouseover", function(d) {
          div.transition()
            .duration(200)
            .style("opacity", 0.8);

          var text;
          if (typeof d.text === 'object') {
            text = "<table>";
            for (var prop in d.text) {
              text += "<tr><td>" + prop + "</td><td>" + d.text[prop] + "</td></tr>";
            }
            text += "</table>";
          } else {
            text = d.text;
          }
          div.html(text);
           // .style("left", d3.event.pageX + "px")
           // .style("top", d3.event.pageY + "px");
        })
      .on("click", function(d, i) {
          for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].highlight) {
              groups[nodes[j].groupId].push(nodes[j]);
            }
            nodes[j].highlight = false;
          }
          nodes[i].highlight = true;
          groupi = groups[nodes[i].groupId];
          groupi.splice(groupi.indexOf(nodes[i]), 1);

          //find connections
          highlightRelated(d, "type", 1, true);
          highlightRelated(d, "role", 2, true);
          highlightRelated(d, "strategy", 3, true);
          highlightRelated(d, "result", 4, true);
          highlightRelated(d, "person", 5, true);
          highlightRelated(d, "area", 6, true);

          highlightRelated(d, "relation", 8, true);

          simulation.force("y", d3.forceY(function(d) { return groups[d.groupId].y / (d.highlight? 2:1); } ).strength(0.2));
          simulation.alpha(0.5);
          simulation.restart();
        })
      .call(d3.drag()
        .subject(dragsubject)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    // .enter().append("circle")
    //   .attr("class", "node")
    //   .attr("cx", function(d) { return d.x; })
    //   .attr("cy", function(d) { return d.y; })
    //   .attr("r", 5)
    //   .style("fill", nodeFill)
    //   // .style("stroke", function(d, i) {
    //   //   return d3.rgb(nodeFill).darker(2);
    //   // })
    //   // .style("stroke-width", 1.5)
    //   // .on("mousemove", groups.snap)
    //   .call(d3.drag()
    //     .subject(dragsubject)
    //     .on("start", dragstarted)
    //     .on("drag", dragged)
    //     .on("end", dragended));

  vis.style("opacity", 1e-6)
    .transition()
    .duration(1000)
    .style("opacity", 1);

  //clusters
  // var groupPath = function(d) {
  //   return "M" + d3.polygonHull(d.map(function(e) { return [e.x, e.y]; })).join("L") + "Z";
  // };
  var groupPath = d3.line()
    .x(function(e) { return e[0]; })
    .y(function(e) { return e[1]; })
    .curve(d3.curveCatmullRomClosed); //curveCatmullRomClosed

  var group = vis.selectAll(".group")
      .data(groups)
    .enter().insert("path", ".node")
      .attr("class", "group")
      .style("fill", nodeFill)
      .style("stroke", nodeFill)
      .style("stroke-width", 50)
      .style("stroke-linejoin", "round")
      .style("opacity", .2)

  //simulation
  simulation = d3.forceSimulation(nodes)
    // .force("charge", d3.forceManyBody().strength(5))
    .force("x", d3.forceX(function(d) { return groups[d.groupId].x; } ).strength(0.2))
    .force("y", d3.forceY(function(d) { return groups[d.groupId].y / (d.highlight? 2:1); } ).strength(0.2))
    .force("collide", d3.forceCollide(8).iterations(3).strength(0.6));

  simulation.on("tick", function(e) {
    nodes.forEach(function(o) {
      if (o.groupId == null) return;
      o.x += groups.delta(o).x * .3;
      o.y += groups.delta(o).y * .3;
    });

    node
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      // .attr("cx", function(d) { return d.x; })
      // .attr("cy", function(d) { return d.y; })
      .style("fill", nodeFill)
      .style("stroke-width", function(d) { return d.highlight? 1.5:0 });

    group.attr("d", function(d) {
      hull = d3.polygonHull(d.map(function(e) { return [e.x, e.y]; }));
      return groupPath(hull);
    });
  });
});
