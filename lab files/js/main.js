//begin script when window loads
window.onload  = initialize();

//the first function called once the html is loaded
function initialize(){
    setMap();
}

//create choropleth map parameters
function setMap(){
    //map frame dimensions
    var width = 460;
    var height = 560;
    
    //create a new svg element with the above dimensions
    var map = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    
    //Create a Albers equal area conic projection, centered on California
    var projection = d3.geo.albers()
        .scale(2300)
        .parallels([34, 46])
        .center([-23, 38])
        .translate([width / 2, height / 2]);
    
    //create svg path generator using the projection
    var path = d3.geo.path()
        .projection(projection);
        
    //uses queue.js to parallelize asynchronous data loading
    queue()
        .defer(d3.csv, "data/data.csv") //load attributes from csv
        .defer(d3.json, "data/output.json") //load geometry from topojson
        .await(callback); //trigger callback function once data is loaded
    
    function callback(error, csvData, output){
        //add usa geometry
        console.log(output);
        var states = map.append("path") //create SVG path element
            .datum(topojson.feature(output, output.objects.usa))
            .attr("class", "states") //class name for styling
            .attr("d", path); //project data as geometry in svg
        
    };
}