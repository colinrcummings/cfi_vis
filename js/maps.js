//map vars
var viewBoxWidth;
var viewBoxHeight;
var scale;
var longitude = 104.9847;
var mapWidth;
var mapHeight;
var projection;
var path;
var mapSVG;
var mapG;
var zoom = d3.behavior.zoom()
  .scaleExtent([1, 8]);


//map functions 
function drawCOMap(peaks, cities) {
  //setup svg dimensions
  viewBoxWidth = 650;
  viewBoxHeight = 495;
  scale = 6500;
  mapWidth = $('#map').width();
  mapHeight = mapWidth * viewBoxHeight / viewBoxWidth;
  //define map projection
  projection = d3.geo.albers()
    .translate([viewBoxWidth/2, viewBoxHeight/1.75])
    .rotate([longitude,0])
    .scale(scale);
  //define path generator
  path = d3.geo.path()
    .projection(projection);
  //create svg element
  mapSVG = d3.select('#map')
    .append('svg')
    .attr('preserveAspectRatio', 'xMidYMid')
    .attr('viewBox', '0 0 ' + viewBoxWidth + ' ' + viewBoxHeight)
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .attr('id', 'co-svg')
    .call(zoom.on('zoom', move));
  //append g element to svg
  mapG = mapSVG.append('g');
  //load in GeoJSON data
  d3.json('data/maps/co_counties.json', function(json) {
    //bind data and create one path per state feature
    mapG.selectAll('path')
     .data(topojson.feature(json, json.objects.counties).features)
     .enter()
     .append('path')
     .attr('d', path)
     .attr('class', 'county')
     .style('fill', '#fcfcfc');
    //add encodings
    drawPeaks(peaks);
    drawCities(cities);
  });
}

function move () {
  var t = d3.event.translate;
  var s = d3.event.scale;
  t[0] = Math.min((s - 1), Math.max(viewBoxWidth * (1 - s), t[0]));
  t[1] = Math.min((s - 1), Math.max(viewBoxHeight * (1 - s), t[1]));
  zoom.translate(t);
  mapG.attr('transform', 'translate(' + t + ')' + ' scale(' + s + ')');
}


//encoding functions
function drawPeaks (data) {
  data = data.sort(function(a,b) { return a.draw_sort - b.draw_sort; });
  mapG.selectAll('.peak')
  .data(data)
  .enter().append('path')
    .attr('class','peak')
    .attr('d', d3.svg.symbol().type('triangle-up').size(40))
    .style('opacity', 0)
    .style('fill', function (d) {
      if(d.status === 'Other') {
        return 'white';
      } else if (d.status === 'Unsurveyed') {
        return 'lightgrey';
      } else {
        switch(d.grade_bucket) {
          case 'A':
            return '#1a9641';
            break;
          case 'B':
            return '#a6d96a';
            break;
          case 'C':
            return '#ffffbf';
            break;
          case 'D':
            return '#fdae61';
            break;  
          case 'F':
            return '#d7191c';
            break;  
        }
      }
    })
    .style('stroke','black')
    .on('mouseover', function(d) {
      peakTooltipShow(d);
    })  
    .on('mouseout', function() { 
      tooltipHide();
    }) 
    .attr('transform', function(d) {
      return 'translate(' + projection([
        d.lon,
        d.lat
      ]) + ')'
    });
  d3.selectAll('.peak')
    .transition()
    .duration(450)
    .style('opacity', .95);
}


function drawCities (data) {
  mapG.selectAll('.city')
  .data(data)
  .enter().append('circle')
    .attr('class','city')
    .attr('cx', function(d) {
      return projection([d.lon, d.lat])[0];
    })
    .attr('cy', function(d) {
      return projection([d.lon, d.lat])[1];
    })
    .attr('r', 2.5)
    .style('opacity', .8)
    .style('fill', 'yellow')
    .style('stroke','black')
    .on('mouseover', function(d) {
      cityTooltipShow(d);
    })  
    .on('mouseout', function() { 
      tooltipHide();
    });
}

//tooltip functions
function peakTooltipShow (hoverObj) {
  //create tooltip
  var tooltip = d3.select('body').append('div')
    .attr('id', 'map-tooltip')
    .attr('class', 'tooltip');
  //determine text
  if (hoverObj.status === 'Other') {
    tooltip.html(
      '<h4>' + hoverObj.peak + '</h4>' + 
      '<p>' + '<b>Status: </b>' + hoverObj.status + '</p>' +
      '<p>' + '<b>Note: </b>' + hoverObj.note + '</p>');    
  } else if (hoverObj.status === 'Unsurveyed') {
    tooltip.html(
      '<h4>' + hoverObj.peak + '</h4>' + 
      '<p>' + '<b>Route(s): </b>' + hoverObj.routes + '</p>' +
      '<p>' + '<b>Status: </b>' + hoverObj.status + '</p>');    
  } else if (hoverObj.status === 'Unplanned') {
    tooltip.html(
      '<h4>' + hoverObj.peak + '</h4>' + 
      '<p>' + '<b>Route(s): </b>' + hoverObj.routes + '</p>' +
      '<p>' + '<b>Status: </b>' + hoverObj.status + '</p>' +
      '<p>' + '<b>Grade: </b>' + hoverObj.grade + '</p>' +
      '<p>' + '<b>Cost: </b>' + hoverObj.cost + '</p>');    
  } else {
    tooltip.html(
      '<h4>' + hoverObj.peak + '</h4>' + 
      '<p>' + '<b>Route(s): </b>' + hoverObj.routes + '</p>' +
      '<p>' + '<b>Status: </b>' + hoverObj.status + '</p>' +
      '<p>' + '<b>Year(s): </b>' + hoverObj.year + '</p>' +
      '<p>' + '<b>Grade: </b>' + hoverObj.grade + '</p>' +
      '<p>' + '<b>Cost: </b>' + hoverObj.cost + '</p>');    
  }
  //position tooltip
  var mouse = d3.mouse(d3.select('body').node()).map( function(d) { return parseInt(d); } );
  var screenWidth = $('body').width();
  var tooltipWidth = $('#map-tooltip').width();
  if((mouse[0] + tooltipWidth) > screenWidth) {
    tooltip
      .style('left', (mouse[0] + (screenWidth - (mouse[0] + tooltipWidth + 5))) + 'px')     
      .style('top', (mouse[1] + 20) + 'px');
  } else {
    tooltip
      .style('left', mouse[0] + 'px')     
      .style('top', (mouse[1] + 20) + 'px');
  }
  //show tooltip
  tooltip   
    .transition()        
    .duration(300) 
    .style('opacity', .95);  
}

function cityTooltipShow (hoverObj) {
  //create tooltip
  var tooltip = d3.select('body').append('div')
    .attr('id', 'map-tooltip')
    .attr('class', 'tooltip');
  tooltip
    .html(
      '<h4>' + hoverObj.name + '</h4>' + 
      '<p>' + '<b>Elevation: </b>' + noDecimalNum(hoverObj.elevation) + ' ft' + '</p>');    
  //position tooltip
  var mouse = d3.mouse(d3.select('body').node()).map( function(d) { return parseInt(d); } );
  var screenWidth = $('body').width();
  var tooltipWidth = $('#map-tooltip').width();
  if((mouse[0] + tooltipWidth) > screenWidth) {
    tooltip
      .style('left', (mouse[0] + (screenWidth - (mouse[0] + tooltipWidth + 5))) + 'px')     
      .style('top', (mouse[1] + 20) + 'px');
  } else {
    tooltip
      .style('left', mouse[0] + 'px')     
      .style('top', (mouse[1] + 20) + 'px');
  }
  //show tooltip
  tooltip   
    .transition()        
    .duration(300) 
    .style('opacity', .95);  
}
