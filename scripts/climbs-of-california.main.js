
  // global data/properties object
  COC = {
    climbList: climbList,
    climbDataArray: [],
    currentPanel: "tab-list",
    mainPanelNode: d3.select("#main-panel-container").node(),
    sortAscendingFlag: 1, // 1 or -1
    plotOriginRelOrAbs: "abs",
    units: "feet",
  };

  COC.panels = [ {id: "tab-map", text: "Map", handler: drawMap}, 
                 {id: "tab-list", text: "List", handler: drawClimbList},
                 {id: "tab-mosaic", text: "Mosaic", handler: function(){}}, ];

  // format climb properties
  COC.climbList.forEach(function (climb, index){
    climb.properties.gain   = Math.round(climb.properties.gain * 3.28); // meters to feet
    climb.properties.len    = Math.round(10*climb.properties.len / 1609.)/10; // meters to miles
    climb.properties.slope  = Math.round(10*100*climb.properties.gain / (climb.properties.len*5280))/10;
    climb.properties.fiets  = climb.properties.fiets;
    climb.properties.maxAlt = Math.round(climb.properties.maxAlt * 3.28);
    climb.properties.id = "climb-" + index;
  });

  // hard-coded climb groups to (eventually) display as examples
  COC.easternSierra = [163, 70, 230, 204, 185, 59];
  COC.eastBay  = [205, 29, 222, 42, 231];
  COC.steepest = [106,160,2,117,1,2015,181];

  // initialize the elevation profile plot
  COC.climbProfilePlot = makeClimbProfilePlot();

  // load the map/list/mosaic tab divs
  loadMainPanelTabs();

  // load the initial main panel tab
  handleMainPanelTabClick(COC.currentPanel);

  window.onresize = windowResized;
  window.setTimeout(window.onresize, 500);

  function windowResized() {
    // rerender the plot from scratch 
    COC.climbProfilePlot.init().update();
  }

  function loadMainPanelTabs() {

    var tabClass = "col-xs-1 tab";

    d3.select("#main-panel-tabs").selectAll("div")
      .data(COC.panels).enter()
      .append("div")
      .attr("class", tabClass)
      .attr("id", function(panel) { return panel.id; })
      .text(function(panel) { return panel.text; })
      .on("click", function(panel) { handleMainPanelTabClick(panel.id); });
  }

  function loadMainPanel() {

    COC.panels.forEach( function(panel) {
      if ((COC.currentPanel===panel.id) && (d3.select(COC.mainPanelNode).attr("id")!==panel.id)) {
        if (!!COC.map) {
          COC.map.remove();
          delete COC.map;
        }
        d3.select(COC.mainPanelNode).selectAll("div").remove();
        panel.handler();
      }
    }); 
  }

  function handleMainPanelTabClick(tabID) {
    
    COC.currentPanel = tabID;

    COC.panels.forEach( function(panel) {
      $("#" + panel.id).removeClass("tab-selected")
                       .addClass(COC.currentPanel===panel.id ? "tab-selected" : ""); 
       });

    loadMainPanel();
  }

  function drawClimbList() {

    // column definitions
    var columns  = [
        {name: "Name", param: "name"},
        {name: "Length", param: "len"},
        {name: "Gain", param: "gain"},
        {name: "Elevation", param: "maxAlt"},
        {name: "Slope", param: "slope"},
        {name: "Fiets", param: "fiets"}
    ];

    var div = d3.select(COC.mainPanelNode).append("div").attr("id", "climb-list-container");

    div.append("table").attr("class", "table");

    var thead = div.select("table").append("thead");
    var tbody = div.select("table").append("tbody");

    thead.append("tr").selectAll("th")
         .data(columns).enter()
         .append("th")
         .attr("class", "all-climbs-td")
         .text(function(d) { return d.name; })
         .on("mouseover", function() { $(this).addClass("tr-hover"); })
         .on("mouseout", function() { $(this).removeClass("tr-hover"); })
         .on("click", function (d) { sortClimbs(d.param); });

    tr = tbody.selectAll("tr")
              .data(COC.climbList).enter()
              .append("tr")
              .on("mouseover", function() { $(this).addClass("tr-hover"); })
              .on("mouseout", function() { $(this).removeClass("tr-hover"); })
              .on("click", function(climbListRow) { addClimbToSelectedClimbs(climbListRow.properties); });

    tr.selectAll("td").data(columns).enter()
      .append("td")
      .attr("class", "all-climbs-td")
      .text(function(column) {
        climbListRow = d3.select(this.parentNode).data()[0]; 
        return climbListRow.properties[column.param];
      });

    sortClimbs('fiets');
  }


  function sortClimbs(param) {

    COC.sortAscendingFlag = COC.sortAscendingFlag===1 ? -1 : 1;

    tr = d3.select(COC.mainPanelNode).select("tbody").selectAll("tr");

    var climbList = tr.data().sort(function(climb1, climb2) { 
      if (climb1.properties[param] >= climb2.properties[param]) { return COC.sortAscendingFlag; }
      if (climb1.properties[param] <  climb2.properties[param]) { return -COC.sortAscendingFlag; }
    });

    tr.data(climbList)
      .selectAll("td")
      .text(function(column) {
        climbListRow = d3.select(this.parentNode).data()[0]; 
        return climbListRow.properties[column.param];
      });
  }


  function drawMap() {

    var mapDiv = d3.select(COC.mainPanelNode).append("div")
                   .attr("id", "map-div")
                   .style("height", "500px");

    COC.map = L.map("map-div");

    //add a tile layer to add to our map, in this case it's the 'standard' OpenStreetMap.org tile server
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
                maxZoom: 18,
                }).addTo(COC.map);

    COC.map.attributionControl.setPrefix(''); // Don't show the 'Powered by Leaflet' text. Attribution overload

    // polyline colors by Fiets index:
    // for 0-3.5 (blue), 3.5-6.5 (red), 6.5-9.5 (purple), 9.5+ (black)
    var ez = '#002aff', md = 'red', hd = '#800080', vhd = 'black';

    var colorList = [ez,ez,ez,ez, md,md,md, hd,hd,hd, vhd];

    // add all of the climb lat/lon coords in COC.climbList (which is in geoJSON) to the map
    climbFeatureGroup = 
      L.geoJson(COC.climbList, {
        onEachFeature: function(feature, layer) {
          layer.bindPopup(feature.properties.name, {closeButton: false, offset: L.point(40, 0)});
          layer.on('mouseover', function() { layer.openPopup();  layer.setStyle({weight: 6}); });
          layer.on('mouseout',  function() { layer.closePopup(); layer.setStyle({weight: 4}); });
          layer.on('click', function() { addClimbToSelectedClimbs(feature.properties); });
        },
        style: function(feature) {
          var fietsIndex = feature.properties.fiets;
          var colorIndex = Math.round(fietsIndex) > 10 ? 10 : Math.round(fietsIndex); 
          return {
                  color: colorList[colorIndex],
                  weight: 4,
                  opacity: 0.9,
                };
        }
      }).addTo(COC.map);

    var berkeley = new L.LatLng(37.8, -122.3); 
    COC.map.setView(berkeley, 11);
  }

  function addClimbToSelectedClimbs(climbProperties) {

    var selectedClimbFnames = COC.climbDataArray.map( function (climbData) { return climbData.fname; });

    // if the climb fname is not in the current list
    if (!selectedClimbFnames.includes(climbProperties.fname)) {
      COC.climbDataArray.push(climbProperties);
    }

    // reload the climb data (this is not efficient)
    loadSelectedClimbData();
  }


  function loadSelectedClimbData() {

      var q = d3.queue();
      var climbData, fnameTCX;
      var colorList = loadColorList();

      COC.climbDataArray.forEach( function (climbData) {
          q.defer( function (callback) {
              d3.csv('.\\data\\csv\\' + climbData.fname, callback);
          });
      });

      q.awaitAll(function (error, CSVDataArray) {

        // copy the CSVData into the climbDataArray
        COC.climbDataArray.forEach( function (climbData, ind) {

          CSVDataArray[ind].forEach(function (row){
            row.alt = row.alt * 3.2808;     // elevation from meters to feet
            row.dst = row.dst * 0.00062137; // distance from meters to miles
            row.lat = +row.lat;
            row.lon = +row.lon;
            return row;
          });

          // reload the track/GPS data and id/name, even if entry is not new - no reason to check, for now
          climbData.track = CSVDataArray[ind];

          // hack to construct a presentable climb name from the TCX filename
          fnameTCX  = CSVDataArray[ind][0].mdata;
          climbData.name = fnameTCX.substring(fnameTCX.lastIndexOf('\\')+1, fnameTCX.lastIndexOf('.'))
                                   .replace('.', '').replace('(', '').replace(')', '').replace(/-/g, ' ');

        });

        // generate a list of used colors
        var usedColorNames = [];
        COC.climbDataArray.forEach( function (climbData) {
          if (climbData.hasOwnProperty('color')) { 
            usedColorNames.push(climbData.color.name); 
          }
        });

        // assign a color if one does not exist (i.e., if this climb was just added)
        COC.climbDataArray.forEach( function (climbData) {
          if (!climbData.hasOwnProperty('color')) {
            climbData.color = colorList.filter(function(color) { return !usedColorNames.includes(color.name); })[0];
            usedColorNames.push(climbData.color.name);
          }
        });

        // calculate some stats for each entry in climbData
        COC.climbDataArray.map(function(climbData) { 

          climbData.len = Math.round(100*climbData.track.last().dst)/100;
          climbData.gain   = Math.round(climbData.track.last().alt - climbData.track[0].alt);

          var gainMeters   = climbData.gain / 3.2808;
          var lengthMeters = climbData.len / 0.00062137;

          climbData.fiets = Math.round( 100*(gainMeters*gainMeters / (10*lengthMeters) + (gainMeters > 1000)*gainMeters/1000) )/100; 
        });

        // display the selected climbs table 
        // (not efficient - better to update)
        displaySelectedClimbList();

        // update the elevation plots 
        COC.climbProfilePlot.update();

    }); // q.awaitAll
  } // function


  function displaySelectedClimbList() {

    var columnNames  = ["", "Name", "Length", "Gain", ];
    var columnParams = ["color-column", "name", "len", "gain", ];

    var climbListDiv = d3.select("#climb-list");

    climbListDiv.select("table").remove();
    climbListDiv.append("table").attr("class", "table");

    var thead = climbListDiv.select("table").append("thead");
    var tbody = climbListDiv.select("table").append("tbody");

    thead.append("tr").selectAll("th")
         .data(columnNames).enter()
         .append("th")
         .attr("class", "selected-climbs-th")
         .text(function(d) { return d; })

    var tr = tbody.selectAll("tr")
                  .data(COC.climbDataArray).enter()
                  .append("tr")
                  .attr("class", "")
                  .on("mouseover", function(climbData) {
                    $(this).addClass("tr-hover");
                    d3.select("#" + climbData.id).attr("stroke-width", 5);
                  })
                  .on("mouseout", function(climbData) {
                    $(this).removeClass("tr-hover");
                    d3.select("#" + climbData.id).attr("stroke-width", 2);
                  })
                  .on("click", function(climbData, i) { onClimbLeftClick(climbData, i); })
                  .on("contextmenu", function(climbData, i) { onClimbRightClick(climbData, i); });

    var td = tr.selectAll("td")
               .data(columnParams).enter()
               .append("td")
               .attr("class", "selected-climbs-td")
               .style("background-color", function(param) {
                if (param=="color-column") {
                  var color = d3.select(this.parentNode).data()[0].color.color.brighter(1);
                  color.opacity = 0.5;
                  return color;
                } else {
                  return ""; }
               })
               .text(function(param) {
                  var climbData = d3.select(this.parentNode).data()[0];
                  if (!climbData.hasOwnProperty(param)) { return ""; }
                  return climbData[param];
                });


    function onClimbLeftClick(climbData) {
      // zoom the map (if currently displayed) to the clicked climb's bounding box

      if (!COC.hasOwnProperty('map')) { return; }

      var match = COC.map.eachLayer(function(layer) {
          if (!!layer.feature && layer.feature.properties.fname.split('.')[0]===climbData.fname.split('.')[0]) {
            COC.map.fitBounds(layer.getBounds());
            return layer;
          }
        });
    }

    function onClimbRightClick(climbData, i) {

        // remove the climb from the list of selected climbs
        COC.climbDataArray.splice(i, 1); 

        // reload the climb data (not efficient)
        loadSelectedClimbData(COC.climbDataArray); 
        
        // prevent right click menu
        d3.event.preventDefault();
    }
  }



  function makeClimbProfilePlot() {

    d3.select("#alt-plot").select("div").remove();
    var plotDiv = d3.select("#alt-plot").append("div");

    var svg, 
        dstXScale = d3.scaleLinear(), 
        eleYScale = d3.scaleLinear(),
        dstXAxis, 
        eleYAxis;

    var props = {
      padL: 50, padR: 10,
      padT: 10, padB: 25,
      plotAspectRatio: 4, };

    var xAxisLabel = {meters: "Distance (km)", feet: "Distance (miles)"},
        yAxisLabel = {meters: "Elevation (meters)", feet: "Elevation (feet)"};


    function climbProfilePlot() {}

    climbProfilePlot.init = function() {

      props.plotWidth = parseInt(plotDiv.style("width"));
      props.plotHeight = props.plotWidth / props.plotAspectRatio;

      plotDiv.select("svg").remove();
      
      svg = plotDiv.append("svg").attr("width", props.plotWidth ).attr("height", props.plotHeight );

      svg.append("g")
         .attr("class", "axis")
         .attr("id", "y-axis-alt")
         .attr("transform", "translate(" + props.padL + ",0)");

      svg.append("g")
         .attr("class", "axis")
         .attr("id", "x-axis-alt")
         .attr("transform", "translate(0," + (props.plotHeight - props.padB) + ")");

      svg.append("text")
          .attr("class", "axis-label")
          .attr("id", "x-axis-label")
          .attr("text-anchor", "middle")
          .attr("x", props.plotWidth/2)
          .attr("y", props.plotHeight - 3)
          .text("Distance (miles)");

      svg.append("text")
          .attr("class", "axis-label")
          .attr("id", "y-axis-label")
          .attr("text-anchor", "middle")
          .attr("x", -props.plotHeight/2)
          .attr("y", 8)
          .attr("transform", "rotate(-90)")
          .text("Elevation (feet)");

      dstXScale.range([props.padL, props.plotWidth - props.padR]).domain([0, 10]);
      eleYScale.range([props.plotHeight - props.padB, props.padT]).domain([0, 10000]);

      dstXAxis = d3.axisBottom(dstXScale).tickSize(0,0);
      eleYAxis = d3.axisLeft(eleYScale).ticks(3).tickSize(-props.plotWidth + props.padL,0);
      
      svg.select("#x-axis-alt").transition().call(dstXAxis);
      svg.select("#y-axis-alt").transition().call(eleYAxis);

      return climbProfilePlot;
    }

    climbProfilePlot.update = function() {

      if (COC.climbDataArray.length==0) { 
        svg.selectAll("path.alt-line").remove();
        return climbProfilePlot; 
      }

      // .dst is in miles - this converts to km
      dstMult = COC.units==="meters" ? 1.609 : 1;
      altMult = COC.units==="meters" ? 0.3048 : 1;

      svg.select("#x-axis-label").text(xAxisLabel[COC.units]);
      svg.select("#y-axis-label").text(yAxisLabel[COC.units]);

      var offset, path, altLine;

      var minElevation = altMult*d3.min(COC.climbDataArray, function(climbData) { return climbData.track[0].alt; });
      var maxElevation = altMult*d3.max(COC.climbDataArray, function(climbData) { return climbData.track.last().alt; });
      var maxDistance  = dstMult*d3.max(COC.climbDataArray, function(climbData) { return climbData.track.last().dst; });
      
      if (COC.plotOriginRelOrAbs==="rel"){
        maxElevation = maxElevation - minElevation;
        minElevation = 0;
      }

      dstXScale.domain([0, maxDistance]);
      eleYScale.domain([minElevation, maxElevation]);

      var paths = svg.selectAll("path.alt-line").data(COC.climbDataArray, function(d) { return d.id; });

      paths.enter().append("path")
           .attr("class", "alt-line")
           .attr("id", function(climbData) { return climbData.id; })
           .attr("stroke", function(climbData) { return climbData.color.color; })
           .attr("stroke-width", 2)
           .attr("fill", "none")
           .on("mouseover", function() { d3.select(this).attr("stroke-width", 5); })
           .on("mouseout", function() { d3.select(this).attr("stroke-width", 2); })
         .merge(paths).transition()
           .attr("d", function(climbData) { 
              var line = d3.line().x(function(d) { return dstXScale(dstMult * d.dst); })
                                  .y(function(d) { return eleYScale(altMult * (d.alt - (COC.plotOriginRelOrAbs==="rel" ? climbData.track[0].alt : 0))); });
              return line(climbData.track); });


      paths.exit().remove();

      svg.select("#x-axis-alt").transition().call(dstXAxis);
      svg.select("#y-axis-alt").transition().call(eleYAxis);

      return climbProfilePlot;
  }


  // add handler for abs/rel elevation origin
  d3.select("#button-origin").on("click", function () {

          var w      = d3.select(this).style("width");
          var label  = {abs: 'Absolute', rel: 'Relative'};
          var flip   = {abs: 'rel', rel: 'abs'};

          COC.plotOriginRelOrAbs = flip[COC.plotOriginRelOrAbs];
          d3.select(this).text(label[COC.plotOriginRelOrAbs]).style("width", w);
          climbProfilePlot.update(); 
        });

  // add handler for abs/rel elevation origin
  d3.select("#button-units").on("click", function () {

          var w     = d3.select(this).style("width");
          var label = {feet: 'Feet', meters: 'Meters'};
          var flip  = {feet: 'meters', meters: 'feet'};

          COC.units = flip[COC.units];

          d3.select(this).text(label[COC.units]).style("width", w);
          climbProfilePlot.update(); 
        });

  return climbProfilePlot;
}




  function loadColorList() {

    var colorList = [
        {name: 'orange', color: "#ff7f0e"},
        {name: 'green', color: "#2ca02c"},
        {name: 'purple', color: "#9467bd"},
        {name: 'brown', color: "#8c564b"},
        {name: 'pink', color: "#e377c2"},
        {name: 'gray', color: "#7f7f7f"},
        {name: 'lime', color: "#17becf"},
        {name: 'teal', color: "#bcbd22"}, 
        ];

    colorList = colorList.map(function(color) { color.color = d3.rgb(color.color); return color; });
  
    return colorList;
  }


Array.prototype.last = function(){
    return this[this.length - 1];
};

Array.prototype.copy = function(){
    return this.slice(0);
}

Array.prototype.unique = function() {
  var elementsAsKeys = {},
      uniqueElements = [];
  for (var i = 0; i < this.length; ++i) {
      if (!elementsAsKeys.hasOwnProperty(this[i])) {
          uniqueElements.push(this[i]);
          elementsAsKeys[this[i]] = 1; // arbitrary value
      }
  }
  return uniqueElements;
}

