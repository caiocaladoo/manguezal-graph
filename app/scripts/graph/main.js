'use strict';

var graph = (function(){

      var width = 960,     // svg width
          height = 600,     // svg height
          dr = 4,      // default point radius
          off = 15,    // cluster hull offset
          expand = {}, // expanded clusters
          data, net, force, hullg, hull, linkg, link, nodeg, node;

      var curve = d3.svg.line()
          .interpolate("cardinal-closed")
          .tension(.85);

      var fill = d3.scale.category20();

      function noop() { return false; }

      function nodeid(n) {
        return n.size ? "_g_"+n.group : n.name;
      }

      function linkid(l) {
        var u = nodeid(l.source),
            v = nodeid(l.target);
        return u<v ? u+"|"+v : v+"|"+u;
      }

      function getGroup(n) { return n.group; }

      // constructs the network to visualize
      function network(data, prev, index, expand) {
        expand = expand || {};
        var gm = {},    // group map
            nm = {},    // node map
            lm = {},    // link map
            gn = {},    // previous group nodes
            gc = {},    // previous group centroids
            nodes = [], // output nodes
            links = []; // output links

        // process previous nodes for reuse or centroid calculation
        if (prev) {
          prev.nodes.forEach(function(n) {
            var i = index(n), o;
            if (n.size > 0) {
              gn[i] = n;
              n.size = 0;
            } else {
              o = gc[i] || (gc[i] = {x:0,y:0,count:0});
              o.x += n.x;
              o.y += n.y;
              o.count += 1;
            }
          });
        }

        // determine nodes
        for (var k=0; k<data.nodes.length; ++k) {
          var n = data.nodes[k],
              i = index(n),
              l = gm[i] || (gm[i]=gn[i]) || (gm[i]={group:i, size:0, nodes:[]});

          if (expand[i]) {
            // the node should be directly visible
            nm[n.name] = nodes.length;
            nodes.push(n);
            if (gn[i]) {
              // place new nodes at cluster location (plus jitter)
              n.x = gn[i].x + Math.random();
              n.y = gn[i].y + Math.random();
            }
          } else {
            // the node is part of a collapsed cluster
            if (l.size == 0) {
              // if new cluster, add to set and position at centroid of leaf nodes
              nm[i] = nodes.length;
              nodes.push(l);
              if (gc[i]) {
                l.x = gc[i].x / gc[i].count;
                l.y = gc[i].y / gc[i].count;
              }
            }
            l.nodes.push(n);
          }
        // always count group size as we also use it to tweak the force graph strengths/distances
          l.size += 1;
        n.group_data = l;
        }

        for (i in gm) { gm[i].link_count = 0; }

        // determine links
        for (k=0; k<data.links.length; ++k) {
          var e = data.links[k],
              u = index(e.source),
              v = index(e.target);
        if (u != v) {
          gm[u].link_count++;
          gm[v].link_count++;
        }
          u = expand[u] ? nm[e.source.name] : nm[u];
          v = expand[v] ? nm[e.target.name] : nm[v];
          var i = (u<v ? u+"|"+v : v+"|"+u),
              l = lm[i] || (lm[i] = {source:u, target:v, size:0});
          l.size += 1;
        }
        for (i in lm) { links.push(lm[i]); }

        return {nodes: nodes, links: links};
      }

      function convexHulls(nodes, index, offset) {
        var hulls = {};

        // create point sets
        for (var k=0; k<nodes.length; ++k) {
          var n = nodes[k];
          if (n.size) continue;
          var i = index(n),
              l = hulls[i] || (hulls[i] = []);
          l.push([n.x-offset, n.y-offset]);
          l.push([n.x-offset, n.y+offset]);
          l.push([n.x+offset, n.y-offset]);
          l.push([n.x+offset, n.y+offset]);
        }

        // create convex hulls
        var hullset = [];
        for (i in hulls) {
          hullset.push({group: i, path: d3.geom.hull(hulls[i])});
        }

        return hullset;
      }

      function drawCluster(d) {
        return curve(d.path); // 0.8
      }

      // --------------------------------------------------------

      // creating the graph
      var graphDiv = d3.select("#socialGraph");

      var svg = graphDiv.append("svg")
         .attr("width", width)
         .attr("height", height);


      var data = getData();

      for(var i = 0; i < data.links.length; i++){
            data.links[i].source = data.nodes[data.links[i].source];
            data.links[i].target = data.nodes[data.links[i].target];
      }

      hullg = svg.append("g");
      linkg = svg.append("g");
      nodeg = svg.append("g");

      init();

      svg.attr("opacity", 1e-6)
            .transition()
            .duration(1000)
            .attr("opacity", 1);


      function init() {
        if (force) force.stop();

        net = network(data, net, getGroup, expand);

        force = d3.layout.force()
            .nodes(net.nodes)
            .links(net.links)
            .size([width, height])
            .linkDistance(function(l, i) {
            var n1 = l.source, n2 = l.target;
          // larger distance for bigger groups:
          // both between single nodes and _other_ groups (where size of own node group still counts),
          // and between two group nodes.
          //
          // reduce distance for groups with very few outer links,
          // again both in expanded and grouped form, i.e. between individual nodes of a group and
          // nodes of another group or other group node or between two group nodes.
          //
          // The latter was done to keep the single-link groups ('blue', rose, ...) close.
          return 30 +
            Math.min(20 * Math.min((n1.size || (n1.group != n2.group ? n1.group_data.size : 0)),
                                   (n2.size || (n1.group != n2.group ? n2.group_data.size : 0))),
                 -30 +
                 30 * Math.min((n1.link_count || (n1.group != n2.group ? n1.group_data.link_count : 0)),
                               (n2.link_count || (n1.group != n2.group ? n2.group_data.link_count : 0))),
                 100);
            //return 150;
          })
          .linkStrength(function(l, i) {
          return 1;
          })
          .gravity(0.05)   // gravity+charge tweaked to ensure good 'grouped' view (e.g. green group not smack between blue&orange, ...
          .charge(-600)    // ... charge is important to turn single-linked groups to the outside
          .friction(0.5)   // friction adjusted to get dampened display: less bouncy bouncy ball [Swedish Chef, anyone?]
            .start();

        hullg.selectAll("path.hull").remove();
        hull = hullg.selectAll("path.hull")
            .data(convexHulls(net.nodes, getGroup, off))
          .enter().append("path")
            .attr("class", "hull")
            .attr("d", drawCluster)
            .style("fill", function(d) { return fill(d.group); })
            .on('mouseover', function(d){
                  console.log("ESTOU NA HULL!");
            })
            .on("click", function(d) {
      console.log("hull click", d, arguments, this, expand[d.group]);
            expand[d.group] = false; init();
          });

        link = linkg.selectAll("line.link").data(net.links, linkid);
        link.exit().remove();
        link.enter().append("line")
            .attr("class", "link")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; })
            .on('mouseover', function(d){
                  console.log("ESTOU NA LINHA!");
            })
            .style("stroke-width", function(d) { return d.size || 1; })

        node = nodeg.selectAll("circle.node").data(net.nodes, nodeid);
        node.exit().remove();
        node.enter().append("circle")
            // if (d.size) -- d.size > 0 when d is a group node.
            .attr("class", function(d) { return "node" + (d.size?"":" leaf"); })
            .attr("r", function(d) { return d.size ? d.size + dr : dr+1; })
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .style("fill", function(d) { return fill(d.group); })
            .on('mouseover', function(d){
                  console.log("ESTOU NA NODE!");
            })
            .on("click", function(d) {
      console.log("node click", d, arguments, this, expand[d.group]);

              if(!expand[d.group]){
                    expand[d.group] = !expand[d.group];
              }
              init();
            });

            node.append("text")
                  .attr("dx", 12)
                  .attr("dy", ".35em")
                  .text(function(d) { return d.name });

            // svg.selectAll("line")
            //     .on("mouseover", function(d){
            //           console.log("ESTOU NA LINAH!");
            //     })
            //     .on("mouseout", function(d){
            //           console.log("ESTOU FORA LINAH!");
            //     });

        node.call(force.drag);

        force.on("tick", function() {
          if (!hull.empty()) {
            hull.data(convexHulls(net.nodes, getGroup, off))
                .attr("d", drawCluster);
          }

          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });

      //     node.attr("cx", function(d) { return d.x; })
      //         .attr("cy", function(d) { return d.y; });
            node.attr("cx", function(d) { return d.x = Math.max(dr, Math.min(width - dr, d.x)); })
                  .attr("cy", function(d) { return d.y = Math.max(dr, Math.min(height - dr, d.y)); });
        });
      }


      function getData(){
            var data = {"nodes":[{"name":"Myriel","group":1},{"name":"Napoleon","group":1},{"name":"Mlle.Baptistine","group":1},{"name":"Mme.Magloire","group":1},{"name":"CountessdeLo","group":1},{"name":"Geborand","group":1},{"name":"Champtercier","group":1},{"name":"Cravatte","group":1},{"name":"Count","group":1},{"name":"OldMan","group":1},{"name":"Labarre","group":2},{"name":"Valjean","group":2},{"name":"Marguerite","group":3},{"name":"Mme.deR","group":2},{"name":"Isabeau","group":2},{"name":"Gervais","group":2},{"name":"Tholomyes","group":3},{"name":"Listolier","group":3},{"name":"Fameuil","group":3},{"name":"Blacheville","group":3},{"name":"Favourite","group":3},{"name":"Dahlia","group":3},{"name":"Zephine","group":3},{"name":"Fantine","group":3},{"name":"Mme.Thenardier","group":4},{"name":"Thenardier","group":4},{"name":"Cosette","group":5},{"name":"Javert","group":4},{"name":"Fauchelevent","group":0},{"name":"Bamatabois","group":2},{"name":"Perpetue","group":3},{"name":"Simplice","group":2},{"name":"Scaufflaire","group":2},{"name":"Woman1","group":2},{"name":"Judge","group":2},{"name":"Champmathieu","group":2},{"name":"Brevet","group":2},{"name":"Chenildieu","group":2},{"name":"Cochepaille","group":2},{"name":"Pontmercy","group":4},{"name":"Boulatruelle","group":6},{"name":"Eponine","group":4},{"name":"Anzelma","group":4},{"name":"Woman2","group":5},{"name":"MotherInnocent","group":0},{"name":"Gribier","group":0},{"name":"Jondrette","group":7},{"name":"Mme.Burgon","group":7},{"name":"Gavroche","group":8},{"name":"Gillenormand","group":5},{"name":"Magnon","group":5},{"name":"Mlle.Gillenormand","group":5},{"name":"Mme.Pontmercy","group":5},{"name":"Mlle.Vaubois","group":5},{"name":"Lt.Gillenormand","group":5},{"name":"Marius","group":8},{"name":"BaronessT","group":5},{"name":"Mabeuf","group":8},{"name":"Enjolras","group":8},{"name":"Combeferre","group":8},{"name":"Prouvaire","group":8},{"name":"Feuilly","group":8},{"name":"Courfeyrac","group":8},{"name":"Bahorel","group":8},{"name":"Bossuet","group":8},{"name":"Joly","group":8},{"name":"Grantaire","group":8},{"name":"MotherPlutarch","group":9},{"name":"Gueulemer","group":4},{"name":"Babet","group":4},{"name":"Claquesous","group":4},{"name":"Montparnasse","group":4},{"name":"Toussaint","group":5},{"name":"Child1","group":10},{"name":"Child2","group":10},{"name":"Brujon","group":4},{"name":"Mme.Hucheloup","group":8}],"links":[{"source":1,"target":0,"value":1},{"source":2,"target":0,"value":8},{"source":3,"target":0,"value":10},{"source":3,"target":2,"value":6},{"source":4,"target":0,"value":1},{"source":5,"target":0,"value":1},{"source":6,"target":0,"value":1},{"source":7,"target":0,"value":1},{"source":8,"target":0,"value":2},{"source":9,"target":0,"value":1},{"source":11,"target":10,"value":1},{"source":11,"target":3,"value":3},{"source":11,"target":2,"value":3},{"source":11,"target":0,"value":5},{"source":12,"target":11,"value":1},{"source":13,"target":11,"value":1},{"source":14,"target":11,"value":1},{"source":15,"target":11,"value":1},{"source":17,"target":16,"value":4},{"source":18,"target":16,"value":4},{"source":18,"target":17,"value":4},{"source":19,"target":16,"value":4},{"source":19,"target":17,"value":4},{"source":19,"target":18,"value":4},{"source":20,"target":16,"value":3},{"source":20,"target":17,"value":3},{"source":20,"target":18,"value":3},{"source":20,"target":19,"value":4},{"source":21,"target":16,"value":3},{"source":21,"target":17,"value":3},{"source":21,"target":18,"value":3},{"source":21,"target":19,"value":3},{"source":21,"target":20,"value":5},{"source":22,"target":16,"value":3},{"source":22,"target":17,"value":3},{"source":22,"target":18,"value":3},{"source":22,"target":19,"value":3},{"source":22,"target":20,"value":4},{"source":22,"target":21,"value":4},{"source":23,"target":16,"value":3},{"source":23,"target":17,"value":3},{"source":23,"target":18,"value":3},{"source":23,"target":19,"value":3},{"source":23,"target":20,"value":4},{"source":23,"target":21,"value":4},{"source":23,"target":22,"value":4},{"source":23,"target":12,"value":2},{"source":23,"target":11,"value":9},{"source":24,"target":23,"value":2},{"source":24,"target":11,"value":7},{"source":25,"target":24,"value":13},{"source":25,"target":23,"value":1},{"source":25,"target":11,"value":12},{"source":26,"target":24,"value":4},{"source":26,"target":11,"value":31},{"source":26,"target":16,"value":1},{"source":26,"target":25,"value":1},{"source":27,"target":11,"value":17},{"source":27,"target":23,"value":5},{"source":27,"target":25,"value":5},{"source":27,"target":24,"value":1},{"source":27,"target":26,"value":1},{"source":28,"target":11,"value":8},{"source":28,"target":27,"value":1},{"source":29,"target":23,"value":1},{"source":29,"target":27,"value":1},{"source":29,"target":11,"value":2},{"source":30,"target":23,"value":1},{"source":31,"target":30,"value":2},{"source":31,"target":11,"value":3},{"source":31,"target":23,"value":2},{"source":31,"target":27,"value":1},{"source":32,"target":11,"value":1},{"source":33,"target":11,"value":2},{"source":33,"target":27,"value":1},{"source":34,"target":11,"value":3},{"source":34,"target":29,"value":2},{"source":35,"target":11,"value":3},{"source":35,"target":34,"value":3},{"source":35,"target":29,"value":2},{"source":36,"target":34,"value":2},{"source":36,"target":35,"value":2},{"source":36,"target":11,"value":2},{"source":36,"target":29,"value":1},{"source":37,"target":34,"value":2},{"source":37,"target":35,"value":2},{"source":37,"target":36,"value":2},{"source":37,"target":11,"value":2},{"source":37,"target":29,"value":1},{"source":38,"target":34,"value":2},{"source":38,"target":35,"value":2},{"source":38,"target":36,"value":2},{"source":38,"target":37,"value":2},{"source":38,"target":11,"value":2},{"source":38,"target":29,"value":1},{"source":39,"target":25,"value":1},{"source":40,"target":25,"value":1},{"source":41,"target":24,"value":2},{"source":41,"target":25,"value":3},{"source":42,"target":41,"value":2},{"source":42,"target":25,"value":2},{"source":42,"target":24,"value":1},{"source":43,"target":11,"value":3},{"source":43,"target":26,"value":1},{"source":43,"target":27,"value":1},{"source":44,"target":28,"value":3},{"source":44,"target":11,"value":1},{"source":45,"target":28,"value":2},{"source":47,"target":46,"value":1},{"source":48,"target":47,"value":2},{"source":48,"target":25,"value":1},{"source":48,"target":27,"value":1},{"source":48,"target":11,"value":1},{"source":49,"target":26,"value":3},{"source":49,"target":11,"value":2},{"source":50,"target":49,"value":1},{"source":50,"target":24,"value":1},{"source":51,"target":49,"value":9},{"source":51,"target":26,"value":2},{"source":51,"target":11,"value":2},{"source":52,"target":51,"value":1},{"source":52,"target":39,"value":1},{"source":53,"target":51,"value":1},{"source":54,"target":51,"value":2},{"source":54,"target":49,"value":1},{"source":54,"target":26,"value":1},{"source":55,"target":51,"value":6},{"source":55,"target":49,"value":12},{"source":55,"target":39,"value":1},{"source":55,"target":54,"value":1},{"source":55,"target":26,"value":21},{"source":55,"target":11,"value":19},{"source":55,"target":16,"value":1},{"source":55,"target":25,"value":2},{"source":55,"target":41,"value":5},{"source":55,"target":48,"value":4},{"source":56,"target":49,"value":1},{"source":56,"target":55,"value":1},{"source":57,"target":55,"value":1},{"source":57,"target":41,"value":1},{"source":57,"target":48,"value":1},{"source":58,"target":55,"value":7},{"source":58,"target":48,"value":7},{"source":58,"target":27,"value":6},{"source":58,"target":57,"value":1},{"source":58,"target":11,"value":4},{"source":59,"target":58,"value":15},{"source":59,"target":55,"value":5},{"source":59,"target":48,"value":6},{"source":59,"target":57,"value":2},{"source":60,"target":48,"value":1},{"source":60,"target":58,"value":4},{"source":60,"target":59,"value":2},{"source":61,"target":48,"value":2},{"source":61,"target":58,"value":6},{"source":61,"target":60,"value":2},{"source":61,"target":59,"value":5},{"source":61,"target":57,"value":1},{"source":61,"target":55,"value":1},{"source":62,"target":55,"value":9},{"source":62,"target":58,"value":17},{"source":62,"target":59,"value":13},{"source":62,"target":48,"value":7},{"source":62,"target":57,"value":2},{"source":62,"target":41,"value":1},{"source":62,"target":61,"value":6},{"source":62,"target":60,"value":3},{"source":63,"target":59,"value":5},{"source":63,"target":48,"value":5},{"source":63,"target":62,"value":6},{"source":63,"target":57,"value":2},{"source":63,"target":58,"value":4},{"source":63,"target":61,"value":3},{"source":63,"target":60,"value":2},{"source":63,"target":55,"value":1},{"source":64,"target":55,"value":5},{"source":64,"target":62,"value":12},{"source":64,"target":48,"value":5},{"source":64,"target":63,"value":4},{"source":64,"target":58,"value":10},{"source":64,"target":61,"value":6},{"source":64,"target":60,"value":2},{"source":64,"target":59,"value":9},{"source":64,"target":57,"value":1},{"source":64,"target":11,"value":1},{"source":65,"target":63,"value":5},{"source":65,"target":64,"value":7},{"source":65,"target":48,"value":3},{"source":65,"target":62,"value":5},{"source":65,"target":58,"value":5},{"source":65,"target":61,"value":5},{"source":65,"target":60,"value":2},{"source":65,"target":59,"value":5},{"source":65,"target":57,"value":1},{"source":65,"target":55,"value":2},{"source":66,"target":64,"value":3},{"source":66,"target":58,"value":3},{"source":66,"target":59,"value":1},{"source":66,"target":62,"value":2},{"source":66,"target":65,"value":2},{"source":66,"target":48,"value":1},{"source":66,"target":63,"value":1},{"source":66,"target":61,"value":1},{"source":66,"target":60,"value":1},{"source":67,"target":57,"value":3},{"source":68,"target":25,"value":5},{"source":68,"target":11,"value":1},{"source":68,"target":24,"value":1},{"source":68,"target":27,"value":1},{"source":68,"target":48,"value":1},{"source":68,"target":41,"value":1},{"source":69,"target":25,"value":6},{"source":69,"target":68,"value":6},{"source":69,"target":11,"value":1},{"source":69,"target":24,"value":1},{"source":69,"target":27,"value":2},{"source":69,"target":48,"value":1},{"source":69,"target":41,"value":1},{"source":70,"target":25,"value":4},{"source":70,"target":69,"value":4},{"source":70,"target":68,"value":4},{"source":70,"target":11,"value":1},{"source":70,"target":24,"value":1},{"source":70,"target":27,"value":1},{"source":70,"target":41,"value":1},{"source":70,"target":58,"value":1},{"source":71,"target":27,"value":1},{"source":71,"target":69,"value":2},{"source":71,"target":68,"value":2},{"source":71,"target":70,"value":2},{"source":71,"target":11,"value":1},{"source":71,"target":48,"value":1},{"source":71,"target":41,"value":1},{"source":71,"target":25,"value":1},{"source":72,"target":26,"value":2},{"source":72,"target":27,"value":1},{"source":72,"target":11,"value":1},{"source":73,"target":48,"value":2},{"source":74,"target":48,"value":2},{"source":74,"target":73,"value":3},{"source":75,"target":69,"value":3},{"source":75,"target":68,"value":3},{"source":75,"target":25,"value":3},{"source":75,"target":48,"value":1},{"source":75,"target":41,"value":1},{"source":75,"target":70,"value":1},{"source":75,"target":71,"value":1},{"source":76,"target":64,"value":1},{"source":76,"target":65,"value":1},{"source":76,"target":66,"value":1},{"source":76,"target":63,"value":1},{"source":76,"target":62,"value":1},{"source":76,"target":48,"value":1},{"source":76,"target":58,"value":1}]};

            return data;
      }

})();
