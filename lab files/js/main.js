//global variables
var keyArray = ["percent_unemployed", "percent_SNAP", "percent_poverty_level", "percent_lessthanhighschool_grad", "median_income_lessthanhighschool_grad"];
var expressed = keyArray[0]; //initial attribute

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
        var recolorMap = colorScale(csvData);
    
        //variables for csv to json data transfer
        var jsonCount = ca.objects.counties.geometries;
        
        //loop through csv to assign each csv values to json county
        for (var i = 0; i < csvData[i]; i++) {
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
                return choropleth(d, recolorMap);
            });
    }; //end callback()
}//end setMap()

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
};

function choropleth(d, recolorMap){
    //get data value
    var value = d.properties[expressed];
    //if value exists, assign it a color, otherwise assign gray
    if (value){
        return recolorMap(value);
    } else{
      return "#ccc";  
    };
};