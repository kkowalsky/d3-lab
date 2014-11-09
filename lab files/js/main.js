//global variables
var keyArray = ["percent_unemployed", "percent_SNAP", "percent_poverty_level", "percent_lessthanhighschool_grad", "median_income_lessthanhighschool_grad"];
var expressed = keyArray[0]; 
var colorize;
var width = 460, height = 560;
var chartWidth = 400, chartHeight = 500;


//begin script when window loads
window.onload  = initialize();

//the first function called once the html is loaded
function initialize(){
    setMap();
}

//create choropleth map parameters
function setMap(){
    
    //create a title for the page 
    var title = d3.select("body")
        .append("h1")
        .text("California Counties Choropleth");
    
    //create a new svg element with the above dimensions
    var map = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "map");
    
    //Create a Albers equal area conic projection, centered on California
    var projection = d3.geo.albers()
        .scale(2300)
        .parallels([34, 46])
        .center([-23, 38])
        .translate([width / 2, height / 2]);
    
    //create svg path generator using the projection
    var path = d3.geo.path()
        .projection(projection);
    
    //create a graticule generator
    var graticule = d3.geo.graticule()
        .step([5, 5]); //puts graticule lines every 10 degrees
    
    //creates graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule
    
    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements
        .data(graticule.lines) //bind graticule lines to each element
        .enter() //creates an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign a class for styling
        .attr("d", path); //project graticule lines
        
    //uses queue.js to parallelize asynchronous data loading
    queue()
        .defer(d3.csv, "data/data.csv") //load attributes from csv
        .defer(d3.json, "data/output.json") //load geometry from topojson
        .defer(d3.json, "data/ca.json")
        .await(callback); //trigger callback function once data is loaded
    
    function callback(error, csvData, output, ca){
        var colorize = colorScale(csvData); //retrieve color scale generator
    
        //variables for csv to json data transfer
        var jsonCount = ca.objects.counties.geometries;
        
        //loop through csv to assign each csv values to json county
        for (var i = 0; i < csvData.length; i++) {
            var csvCounty = csvData[i] //current county
            var csvGEOID = csvCounty.GEOID; //GEOID code
            
            //loop through json counties to find right county
            for (var j = 0; j < jsonCount.length; j++) {
                //where GEOID codes match, attach csv to json object
                if (jsonCount[j].properties.GEOID == csvGEOID) {
                    //assign all five key/value pairs
                    for (var key in keyArray){
                        var attr = keyArray[key];
                        var val = parseFloat(csvCounty[attr]);
                        jsonCount[j].properties[attr] = val;
                    }; 
                    jsonCount[j].properties.name = csvCounty.name; //set prop
                    break; 
                };
            };  
        };
 
        //add usa geometry
        var states = map.append("path") //create SVG path element
            .datum(topojson.feature(output, output.objects.usa))
            .attr("class", "states") //class name for styling
            .attr("d", path); //project data as geometry in svg
        
        //add counties to map as enumeration units colored by data
        var counties = map.selectAll(".counties")
            .data(topojson.feature(ca, ca.objects.counties).features)
            .enter() //create data
            .append("g") //give province its own g element
            .attr("class", "counties") //class name for styling
            .append("path") 
            .attr("class", function (d) { return d.properties.GEOID })
            .attr("d", path) //project data as geometry in svg
            .style("fill", function(d) {
                //color enumeration units
                return choropleth(d, colorize);
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel)
            .append("desc")
                .text(function(d){
                    return choropleth(d, colorize);
                });
        
        createDropdown(csvData);
        setChart(csvData, colorize);
    }; //end callback()
}//end setMap()

function createDropdown(csvData){
    //add a select element for the dropdown menu
    var dropdown = d3.select("body")
        .append("div")
        .attr("class", "dropdown") //for positioning menu with css
        .html("<h3>Select Variable: </h3>  ")
        .append("select")
        .on("change", function(){ 
            changeAttribute(this.value, csvData)});
    
    //create each option element within the dropdown
    dropdown.selectAll("options")
        .data(keyArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d})
        .text(function(d){
            d = d[0].toUpperCase() + d.substring(1,3) + " " + d.substring(3);
            return d
        });
}; //end createDropdown()

function setChart(csvData, colorize){
    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart")
        .style("margin-left", "500px");
    
    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle");
    
    //set bars for each county
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){ return a[expressed] - b[expressed]})
        .attr("class", function(d) {
            return "bar " + d.GEOID;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
    
    //adjust bars according to current attribute
    updateChart(bars, csvData.length);
}; //end setChart()

function colorScale(csvData){
    //create quantile classes with color scale
    var color = d3.scale.quantile() //designate generator
        .range([
            "#FEF0D9",
            "#FDCC8A",
            "#FC8D59",
            "#E34A33",
            "#B30000"    
        ]);
    
    //build array of all currently expresed values for input domain
    var domainArray = [];
    for (var i in csvData) {
        domainArray.push(Number(csvData[i][expressed]));
    };
    
    //pass array of expressed values as domain
    color.domain(domainArray);
    
    return color;
}; //end colorScale()

function choropleth(d, colorize, error){
    //get data value
    var value = d.properties ? d.properties[expressed] : d[expressed];

    //if value exists, assign it a color, otherwise assign gray
    if (value){
        return colorize(value); 
    } else{
      return "#ccc";  
    };
}; //end choropleth()

function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    colorize = colorScale(csvData);
    
    //recolor the map
    d3.selectAll(".counties") //select every county
        .select("path")
        .style("fill", function(d){
            return choropleth(d, colorize);
        })
        .select("desc")
            .text(function(d) {
                return choropleth(d, colorScale(csvData));
            });
    
    //re-sort the bar chart
    var bars = d3.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed] - b[expressed];
        })
        .attr("class", function(d){
            return "bar" + "."+ d.name;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel)
        .transition() //add animation
        .delay(function(d, i){
            return i * 10
        });
    
    //update bars according to current attribute
    updateChart(bars, csvData.length);
}; //end changeAttribute()

function updateChart(bars, numbars){
        //style bars according to currently expressed attribute
       bars.attr("height", function(d, i){
           return Number(d[expressed]) * 3;
       })
       .attr("y", function(d, i){
           return chartHeight - Number(d[expressed]) * 3;
       })
       .attr("x", function(d, i){
           return i * (chartWidth / numbars);
       })
       .style("fill", function(d){
          return choropleth(d, colorize); 
       });
       
       //update chart title
       d3.select(".chartTitle")
        .text("Number of "+ 
            expressed[0].toUpperCase() +
            expressed.substring(1,3) + " " +
            expressed.substring(3) +
            " In Each County");
}; //end updateCharts()

function highlight(data){
    var props = data.properties ? data.properties : data;
    d3.selectAll("."+ props.name)
        .style("fill", "#000");
    
    var labelAttribute = "<h1>"+props[expressed]+
        "</h1><br><b>"+expressed+"</b>"; //label content
    var labelName = props.name //html string for name to go in child div
    
    //create info label div
    var infolabel = d3.select("body")
        .append("div") 
        .attr("class", "infolabel")
        .attr("id", props.GEOID+"label")
        .html(labelAttribute)
        .append("div")
        .attr("class", "labelname")
        .html(labelName);
}; //end highlight()

function dehighlight(data){
    var props = data.properties ? data.properties : data;
    var counts = d3.selectAll("."+props.name);
    var fillcolor = counts.select("desc").text();
    counts.style("fill", fillcolor);
    
    d3.select("#"+props.name+"label").remove();
}; //end dehighlight()
 
function moveLabel(){
    //horizontal label coordinate based mouse position stored in d3.event
    var x = d3.event.clientX < window.innerWidth - 245 ? d3.event.clientX+10 : d3.event.clientX-210;
    var y = d3.event.clientY < window.innerHeight - 100 ? d3.event.clientY-75 : d3.event.clientY-175;
    
    d3.select(".infolabel")
        .style("margin-left", x+"px")
        .style("margin-top", y+"px");
}; //end moveLabel()