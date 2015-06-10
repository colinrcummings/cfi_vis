//crossfilter object
var peakCrossFilter;
//crossfilter filters
var gradeFilter,
  costFilter,
  rangeFilter,
  statusFilter;
//accessor functions
var gradeAccessor = function(a) {return a.grade_bucket;};
var costAccessor = function(a) {return a.cost;};
var rangeAccessor = function(a) {return a.range;};
var statusAccessor = function(a) {return a.status;};
//chart vars
var charts = {
  "grade": {
    "name": "grade",
    "domain": ['A', 'B', 'C', 'D', 'F','Unknown','N/A']
    },
  "cost": {
    "name": "cost",
    "domain": ['$', '$$', '$$$', '$$$$', '$$$$$', '$$$$$$','Unknown','N/A']
    }
};
var gradeChart,
  costChart;
//data point vars
var percentDenom;


//page setup
$( document ).ready(function(){
  queue()
  .defer(d3.csv, '/data/peaks.csv')
  .defer(d3.csv, '/data/cities.csv')
  .awaitAll(function(error, data) {  
    //set crossfilter object
    peakCrossFilter = crossfilter(data[0]);
    //update crossfilter filters
    gradeFilter = peakCrossFilter.dimension(gradeAccessor);
    costFilter = peakCrossFilter.dimension(costAccessor);
    rangeFilter = peakCrossFilter.dimension(rangeAccessor);
    statusFilter = peakCrossFilter.dimension(statusAccessor);
    //set data point vars
    percentDenom = gradeFilter.top(Infinity).length;
    //draw map
    drawCOMap(gradeFilter.top(Infinity), data[1]);
    //setup charts
    gradeChart = new BarChart(charts.grade);
    costChart = new BarChart(charts.cost);
    //draw charts
    drawCharts();
  });
});


//resize function
$(window).resize(function() {
  var mapWidth = $('#map').width() ;
  var mapHeight = mapWidth * viewBoxHeight / viewBoxWidth;
  mapSVG.attr('width', mapWidth);
  mapSVG.attr('height', mapHeight);
  $('#grade-bar').attr('height', mapHeight * .5);
  $('#cost-bar').attr('height', mapHeight * .5);
});


//view functions
function drawCharts() {
  gradeChart.draw(charts.grade, keyThenCount(gradeAccessor, gradeFilter.top(Infinity)));
  costChart.draw(charts.cost, keyThenCount(costAccessor, costFilter.top(Infinity)));
}

function updateChartsAndMap() {
  gradeChart.update(charts.grade, keyThenCount(gradeAccessor, gradeFilter.top(Infinity)));
  costChart.update(charts.cost, keyThenCount(costAccessor, costFilter.top(Infinity)));
  d3.selectAll('.peak').remove();
  drawPeaks(costFilter.top(Infinity));
}


//bar chart classes
var BarChart = function(chart) {
  this.margin = {top: 0, right: 5, bottom: 35, left: 25};
  this.viewBoxWidth = 348 - this.margin.left - this.margin.right;
  this.viewBoxHeight = (this.viewBoxWidth * 0.49) - this.margin.top - this.margin.bottom;
  this.chartWidth = $('.chart').width();
  var mapWidth = $('#map').width() ;
  var mapHeight = mapWidth * viewBoxHeight / viewBoxWidth;
  this.chartHeight = mapHeight * .5;
  $('#cost-bar').attr('height', mapHeight * .5);
  this.svg = d3.select('#' + chart.name + '-bar')
    .attr('preserveAspectRatio', 'xMidYMid')
    .attr('viewBox', '0 0 ' + this.viewBoxWidth + ' ' + this.viewBoxHeight)
    .attr('width', this.chartWidth)
    .attr('height', this.chartHeight)
    .append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
  this.x = d3.scale.ordinal()
    .domain(chart.domain)
    .rangeRoundBands([0, this.viewBoxWidth * .9], .1);
  this.xAxis = d3.svg.axis()
    .scale(this.x)
    .orient('bottom');
  this.svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + this.viewBoxHeight + ')')
    .call(this.xAxis);
}

BarChart.prototype.draw = function(chart, data) {
  this.y = d3.scale.linear()
    .domain([0, d3.max(data.map(function(d){return d.values}))])
    .rangeRound([this.viewBoxHeight, 0])
    .nice();
  this.yAxis = d3.svg.axis()
    .scale(this.y)
    .orient('left')
    .ticks(5)
    .tickFormat(d3.format("d"));
  this.svg.append('g')
    .attr('class', 'y axis')
    .call(this.yAxis);
  var x = this.x;
  var y = this.y;
  this.bars = this.svg.selectAll('rect')
    .data(data)
    .enter().append("rect")
      .attr('class', chart.name + '-bar')
      .attr('value', function(d){return d.key; })
      .attr("x", function(d) { return x(d.key); })
      .attr("y", this.viewBoxHeight)
      .attr("width", this.x.rangeBand())
      .attr("height", 0)
      .style('fill','white')
      .style('stroke','white')
      .on('mouseover', function(d) {
        barTooltipShow(d);
      })  
      .on('mouseout', function() { 
        tooltipHide();
      }) 
      .on("click", function(d){
        barClick(this, d);
      })
    .transition()
    .duration(750)
      .attr("height", function(d) { return y(0) - y(d.values); })
      .attr("y", function(d) { return y(d.values); })
      .style('fill', function(d){
        if(chart.name === 'grade') {
          switch(d.key) {
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
            case 'Unknown':
              return 'lightgrey';
              break; 
            case 'N/A':
              return 'white';
              break; 
          }
        } else if (chart.name === 'cost') {
          switch(d.key) {
            case '$':
              return '#ffffb2';
              break;
            case '$$':
              return '#fed976';
              break;
            case '$$$':
              return '#feb24c';
              break;
            case '$$$$':
              return '#fd8d3c';
              break;  
            case '$$$$$':
              return '#f03b20';
              break;  
            case '$$$$$$':
              return '#bd0026';
              break;  
            case 'Unknown':
              return 'lightgrey';
              break; 
            case 'N/A':
              return 'white';
              break; 
          }
        }
      })
      .style('stroke','#777');
}

BarChart.prototype.update = function(chart, data) {
  this.svg.select(".y.axis").remove();
  this.y = d3.scale.linear()
    .domain([0, d3.max(data.map(function(d){return d.values}))])
    .rangeRound([this.viewBoxHeight, 0])
    .nice();
  this.yAxis = d3.svg.axis()
    .scale(this.y)
    .orient('left')
    .ticks(5)
    .tickFormat(d3.format("d"));
  this.svg.append('g')
    .attr('class', 'y axis')
    .call(this.yAxis);
  var x = this.x;
  var y = this.y;
  this.bars = this.svg.selectAll('.' + chart.name + '-bar')
    .data(data, function(d) { return d.key; });
  this.bars.enter().append("rect")
    .attr('class', chart.name + '-bar')
    .attr("x", function(d) { return x(d.key); })
    .attr("y", this.viewBoxHeight)
    .attr("height", 0)
    .attr("width", x.rangeBand())
    .style('fill', 'white')
    .style('stroke','white')
    .on('mouseover', function(d) {
      barTooltipShow(d);
    })  
    .on('mouseout', function() { 
      tooltipHide();
    }) 
  .on("click", function(d){
      barClick(this, d);
    });
  this.bars.exit().remove();
  this.bars
    .transition()
    .duration(500)
      .attr("height", function(d) { return y(0) - y(d.values); })
      .attr("y", function(d) { return y(d.values); })
      .style('fill', function(d){
        if(chart.name === 'grade') {
          switch(d.key) {
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
            case 'Unknown':
              return 'lightgrey';
              break; 
            case 'N/A':
              return 'white';
              break; 
          }
        } else if (chart.name === 'cost') {
          switch(d.key) {
            case '$':
              return '#ffffb2';
              break;
            case '$$':
              return '#fed976';
              break;
            case '$$$':
              return '#feb24c';
              break;
            case '$$$$':
              return '#fd8d3c';
              break;  
            case '$$$$$':
              return '#f03b20';
              break;  
            case '$$$$$$':
              return '#bd0026';
              break;  
            case 'Unknown':
              return 'lightgrey';
              break; 
            case 'N/A':
              return 'white';
              break; 
          }
        }
      })
      .style('stroke','#777');
}


//bar click functions
function barClick(clickRect, clickObj) {
  switch(clickRect.className.baseVal) {
    case 'grade-bar':
      gradeFilter.filter(clickObj.key);
      d3.select('#grade-text').text(clickObj.key);
      d3.select('#grade-clear-btn').style('display','inline-block');
      break;
    case 'cost-bar':
      costFilter.filter(clickObj.key);
      d3.select('#cost-text').text(clickObj.key);
      d3.select('#cost-clear-btn').style('display','inline-block');
      break;
  }
  updateChartsAndMap();
}

function clearBarClick(filter) {
  switch(filter) {
    case 'grade':
      gradeFilter.filterAll();
      d3.select('#grade-clear-btn').style('display','none');
      break;
    case 'cost':
      costFilter.filterAll();
      d3.select('#cost-clear-btn').style('display','none');
      break;
  }
  updateChartsAndMap();
}


//bar tooltip functions
function barTooltipShow (hoverObj) {
  //determine tooltip text
  var tooltipText;
  switch(hoverObj.key) {
    case '$':
      tooltipText = '< $125K';
      break;
    case '$$':
      tooltipText = '$125K - $250K';
      break;
    case '$$$':
      tooltipText = '$250K - $500K';
      break;
    case '$$$$':
      tooltipText = '$500K - $1 million';
      break;
    case '$$$$$':
      tooltipText = '$1 million - $2 million';
      break;
    case '$$$$$$':
      tooltipText = '> $2 million';
      break;
    default: 
      tooltipText = hoverObj.key;
} 
  //create tooltip
  var tooltip = d3.select('body').append('div')
    .attr('id', 'chart-tooltip')
    .attr('class', 'tooltip');
  tooltip
    .html('<h4>' + tooltipText + '</h4>' + '<p>' + hoverObj.values + ' (' + oneDecimalPct(hoverObj.values / percentDenom) + ')' + '</p>');   
  //position tooltip
  var mouse = d3.mouse(d3.select('body').node()).map( function(d) { return parseInt(d); } );
  var screenWidth = $('body').width();
  var tooltipWidth = $('#chart-tooltip').width();
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


//data functions
function keyThenCount (accessor, data) {
  var keyAndCount = d3.nest()
    .key(accessor)
    .rollup(function(d) {
      return d.length;
    });
  var keyAndCountData = keyAndCount.entries(
    data.map(function(d) {
      return d;
    })
  );
  return keyAndCountData;
}


//helper functions
function tooltipHide () {
  d3.selectAll('.tooltip')  
    .remove(); 
}


//formatters
var noDecimalPct = d3.format('.0%');
var oneDecimalPct = d3.format('.1%');
var twpDecimalPct = d3.format('.2%');
var noDecimalNum = d3.format(',.0f');
var oneDecimalNum = d3.format(',.1f');
var twoDecimalNum = d3.format(',.2f');
var numDate = d3.time.format("%m/%d/%Y");
var numDateTime = d3.time.format("%m/%d/%Y %H:%M");
var shortTextDateTime = d3.time.format("%a, %b %d, %Y %H:%M");
var longTextDateTime = d3.time.format("%A, %B %d, %Y %H:%M");

