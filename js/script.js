var mapExtent = [0.00000000, -4096.00000000, 4096.00000000, 0.00000000];
var mapMinZoom = 0;
var mapMaxZoom = 5;
var mapMaxResolution = 1.00000000;
var mapMinResolution = Math.pow(2, mapMaxZoom) * mapMaxResolution;;
var tileExtent = [0.00000000, -4096.00000000, 4096.00000000, 0.00000000];
var crs = L.CRS.Simple;
crs.transformation = new L.Transformation(1, -tileExtent[0], -1, tileExtent[3]);
crs.scale = function(zoom) {
	return Math.pow(2, zoom) / mapMinResolution;
};
crs.zoom = function(scale) {
	return Math.log(scale * mapMinResolution) / Math.LN2;
};
var layerDapi;
var layerNissl;
var layerPolyA;
var selectedStain;

var url = "tile_point/{z}/X_{x}_Y_{y}.csv"
var url_list = [];
var imageSize = 8192;
var view = {
      row: 0,
      col: 0,
    };

var selected_circles = {};
var all_circles = {};
var all_circles_list = [];
var genes = [];
var circles = [];

var g_layers = {};
//var g_layergroups = {};
var g_displayed = new Set([]);
var g_color = {};
var pointlist = [];

// Load map on HTML5 Canvas for faster rendering
var map = new L.Map('map', {
	preferCanvas: true,
	maxZoom: mapMaxZoom,
	minZoom: mapMinZoom,
	crs: crs
});

var colorlist = [
	"#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
	"#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
	"#5A0007", "#809693", "#FEFFE6", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
	"#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
	"#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
	"#372101", "#FFB500", "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
	"#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66",
	"#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",
	"#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
	"#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00",
	"#7900D7", "#A77500", "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700",
	"#549E79", "#FFF69F", "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
	"#5B4534", "#FDE8DC",
	"#000000", "#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
	"#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
	"#5A0007", "#809693", "#FEFFE6", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
	"#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
	"#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
	"#372101"
];

function getcolor(gene_id){
	var occupied = [];
	for(i=0; i<50; i++){
		occupied.push(0);
	}
	g_displayed.forEach(function(g_id){
		occupied[g_color[g_id]] = 1;
	});
	for(i=0; i<50; i++){
		if(occupied[i]==0){
			return i;
		}
	}
}

function refreshView(){
    let center = map.getCenter();
    let references = getReference(L.latLngBounds([center]));
    console.log(L.latLngBounds([center]));
    if (!references || !references[0]) return;
    if (view.row == references[0].row && view.col == references[0].col){
    	return 0;
    } 
    view = references[0];
    return view;
}

function getReference(bounds){
    let zoom = map.getZoom();
    let tileNumber = Math.ceil(Math.pow(2, zoom));
    let tileSize = imageSize / tileNumber;
    if (bounds) {
        var temp = [];
        var xstart = Math.floor(bounds.getWest() / tileSize);
        var xstop = Math.floor(bounds.getEast() / tileSize);
        var ystart = Math.floor(bounds.getNorth() / tileSize);
        var ystop = Math.floor(bounds.getSouth() / tileSize);
        if (xstop === (bounds.getEast() / tileSize)) xstop--;
        if (ystop === (bounds.getSouth() / tileSize)) ystop--;
        for (var i = xstart; i <= xstop; i++) {
        	for (var j = ystart; j <= ystop; j++) {
        		//if (i>=0 && j>=0){
            	temp.push([i, j]);
            	//}
          	}
        }
        var res = temp.map((coord) => {
          return ({
            col: coord[0],
            row: coord[1] + 1
          })
        });
        return (res);
    }
}

function loadData(reference){
	if(reference == 0){
		return 0;
	}
	//url_list.length = 0;
	map.removeLayer(selected_circles);
	map.removeLayer(all_circles);
	//for (var j = 0; j < all_circles_list.length; j++) map.removeLayer(all_circles_list[j]);
	let zoom = map.getZoom();
	var original_url = "tile_point/{z}/X_{x}_Y_{y}.csv";
	url = original_url.replace("{z}", zoom);
	/*
	for(var i = reference.col-1; i < reference.col+2; i++){
		for(var j = reference.row-1; j < reference.row+2; j++){
			temp_url = original_url.replace("{x}", i);
    		temp_url = temp_url.replace("{y}", -j);
    		url_list.push(temp_url);
		}
	}
	*/
    url = url.replace("{x}", reference.col);
    url = url.replace("{y}", -reference.row);
    return 1;
}

function drawMarkers(load_data, gene_colorlist){
	if(load_data == 0) return;
	var p_circle = [];
	var point_size = map.getZoom() * 0.8;
	//for (var j = 0; j < url_list.length; j++) {
		//console.log(url_list[j]);
		//fetch(url_list[j])
	fetch(url)
    .then(response => response.text())
    	.then(function(text){
    		console.log("checked");
   	    	pointlist = text.split("\n");
        	for (i = 0; i < pointlist.length-1; i++) {
        	    var newplist = pointlist[i].split(",");
        	    x = Number(newplist[0]);
       		    y = Number(newplist[1]);
	            gene_id = String(newplist[4]);
	            cellid = String(newplist[3]);
	            cell_type = cellid;
	            cell_color = gene_colorlist[cellid -1];
	            var marker = L.circleMarker(map.unproject([x, y], map.getMaxZoom()), {
	            	radius: point_size,
	            	color: cell_color,
	            	fillOpacity: 0.5,
    	        	stroke: false,
					"gene_id": gene_id,   
        		});
	        	marker_coords_str = "<b>Cell:</b> " + cell_type + "<br>" + "<b>Gene:</b> " + gene_id;
    	    	marker.bindTooltip(marker_coords_str).openTooltip();
				p_circle.push(marker);
        	}; 
        	//all_circles_list[j] = new L.LayerGroup(p_circle).addTo(map);  
        	all_circles = new L.LayerGroup(p_circle).addTo(map);      
		});
	//}
}

//requires g_displayed, g_color, colorlist
function drawSelectedMarkers(load_data, selected_gene, gene_colors, gene_colorlist){
	if(load_data == 0) return;
	var new_circles = [];
	var point_size = map.getZoom() * 1.2;
    fetch(url)
    .then(response => response.text())
    .then(function(text){
    	console.log("loaded");
        pointlist = text.split("\n");
		for(i=0; i<pointlist.length-1; i++){
			var newplist = pointlist[i].split(",");
			var gene_id = newplist[4];
			if(selected_gene.has(gene_id)){
				x = Number(newplist[0]);
				y = Number(newplist[1]);
				cellid = String(newplist[3]);
				gene_color = gene_colors[gene_id];
				var marker = L.circleMarker(map.unproject([x, y], map.getMaxZoom()), {
					radius: point_size, 
					color: gene_colorlist[gene_color], 
					fillOpacity: 1.0,
					stroke: false, 
					"gene_id": gene_id,   
				});
				marker_coords_str = "<b>Cell:</b> " + cellid + "<br>" + "<b>Gene:</b> " + gene_id;
				marker.bindTooltip(marker_coords_str).openTooltip();
				new_circles.push(marker);
			}
		};
		selected_circles = new L.LayerGroup(new_circles).addTo(map);
    });
}

L.Control.include({
  _refocusOnMap: L.Util.falseFn // Do nothing.
});

$("#stain")
.append($("<li>").append($("<a>").attr("id", "stain_dapi").attr("href", "#").text("DAPI")
	.click(function(e){
		selectedStain = "dapi";
		map.removeLayer(layerNissl);
		map.removeLayer(layerDapi);
		map.removeLayer(layerPolyA);
		layerDapi.addTo(map);
	}))
)
.append($("<li>").append($("<a>").attr("id", "stain_nissl").attr("href", "#").text("Nissl")
	.click(function(e){
		selectedStain = "nissl";
		map.removeLayer(layerNissl);
		map.removeLayer(layerDapi);
		map.removeLayer(layerPolyA);
		layerNissl.addTo(map);
	}))
)
.append($("<li>").append($("<a>").attr("id", "stain_polyA").attr("href", "#").text("PolyA")
	.click(function(e){
		selectedStain = "polyA";
		map.removeLayer(layerNissl);
		map.removeLayer(layerDapi);
		map.removeLayer(layerPolyA);
		layerPolyA.addTo(map);
	}))
);


layerDapi = L.tileLayer('image_tiles_0_7/{z}/map_{x}_{y}.png', {
	minZoom: mapMinZoom, maxZoom: mapMaxZoom,
	noWrap: true,
	tms: false
});

layerNissl = L.tileLayer('image_tiles/{z}/map_{x}_{y}.png', {
	minZoom: mapMinZoom, maxZoom: mapMaxZoom,
	noWrap: true,
	tms: false
});

layerPolyA = L.tileLayer('image_tiles_0_4/{z}/map_{x}_{y}.png', {
	minZoom: mapMinZoom, maxZoom: mapMaxZoom,
	noWrap: true,
	tms: false
});

layerNissl.addTo(map);

      // Fit map to max bounds
map.fitBounds([
	crs.unproject(L.point(mapExtent[2], mapExtent[3])),
	crs.unproject(L.point(mapExtent[0], mapExtent[1]))
]);
L.control.mousePosition().addTo(map);

      // Set different zoom layers
      //var zoom6layer = new L.FeatureGroup();

      // Set list of colors
      // COLORS WILL NEED TO BE EDITED FOR GRADIENT/MORE GROUPS


L.LayerGroup.include({
	customGetLayer: function (id) {
		for (var i in this._layers) {
			if (this._layers[i].options.id == id) {
				return this._layers[i];
			}
		}
	},
	customGetLayers: function (gene_id){
		var ret = [];
		for (var i in this._layers){
			if(this._layers[i].options.gene_id==gene_id){
				ret.push(this._layers[i]);
			}
		}
		return ret;
	},
});

fetch("roi.pos0.all.cells.converted.txt")
.then(response2 => response2.text())
.then(function(text2){
	console.log("load segmentations");
	var seg = text2;
	seglist = seg.split("\n");
	i = 0;
	var map_cell = {};
	//alert(seglist);
	for(i=0; i<44047; i++){
		var newplist = seglist[i].split(",");
		x = Number(newplist[1]);
		y = Number(newplist[2]);
		cell_id = String(newplist[0]);
		a = [x,y];
		if(map_cell.hasOwnProperty(cell_id)){
			map_cell[cell_id].push(a);
			//alert(map_cell[cell_id]);
		}
		else{
			map_cell[cell_id] = [];
			map_cell[cell_id].push(a);
		}
		//alert(x + " " + y + " " + cell_id);
	}
	//alert("Here");
	Object.keys(map_cell).forEach(function (cell_id){
		var latlngs = [];
		//alert(cell_id + " " + map_cell[cell_id].length);
		for(i=0; i<map_cell[cell_id].length; i++){
			var latlng = map.unproject(map_cell[cell_id][i], map.getMaxZoom());
			latlngs.push([latlng.lat, latlng.lng]);
		}
		//alert(latlngs);
		var polygon = L.polygon(latlngs, {color:"red", weight:1, fill:false}).addTo(map);
		//zoom6layer.addLayer(polygon);
		});
});
      // Load point data for zoom 5,6 markers
      // FILE NAME WILL NEED TO BE EDITED
      // FILE FORMAT SHOULD BE IN FORM: Cell Name, x, y, cluster #

var selected_circles = {};
fetch("gene.list")
	.then(response => response.text())
	.then(function(text){
		var glist = text.split("\n");
		genes = glist;
		$("#search_box").autocomplete({
			source: glist,
			select: function(event, ui){
				if(g_displayed.size==0){
					map.removeLayer(circles);
				}
				var this_id = ui.item.value;
				if(g_displayed.has(this_id)){
					return ;
				}else{
					if(getcolor(this_id)>=0){
						g_color[this_id] = getcolor(this_id);
						g_displayed.add(this_id);
					}else{
						alert("BAD");
					}
					$("#color_legend tr").append($("<td>")
						.attr("id", "gene_" + this_id)
						.attr("bgcolor", colorlist[g_color[this_id]])
						.text(this_id)
						.append($("<img>")
							.attr("src", "open-iconic-master/svg/circle-x.svg")
							.attr("alt", "circle-x")
							.attr("width", "12")
							.attr("height", "12")
							.click(function(e){
								var sel = $("#color_legend tr td[id='gene_" + this_id + "']");
								sel.remove();
								g_displayed.delete(this_id);
								delete g_color[this_id];
								map.removeLayer(selected_circles);
								drawSelectedMarkers(1, g_displayed, g_color, colorlist);
							})
						)
					);
				}
				map.removeLayer(selected_circles);
				var new_reference = refreshView();
				drawSelectedMarkers(1, g_displayed, g_color, colorlist);
				//new_circles = drawMarkers(pointlist);
				//selected_circles = new L.LayerGroup(new_circles).addTo(map);
			},
		});
	});

map.setView([-2048, 2048],3);
var new_reference = refreshView();


$("#all_genes").click(function(e){
	if(this.checked){
    	var new_reference = refreshView();
    	//var load_state = loadData(new_reference);
    	drawMarkers(1, colorlist);
	}else{
		map.removeLayer(all_circles);
	}
});

map.on('moveend', function(e) {
    if($("#all_genes").is(':checked')){
    	var new_reference = refreshView();
    	if(map.getZoom() <= 2){
    		map.removeLayer(all_circles);
    		return;
    	}
    	var load_state = loadData(new_reference);
    	drawMarkers(load_state, colorlist);
	}else{
    	var new_reference = refreshView();
    	var load_state = loadData(new_reference);
    	drawSelectedMarkers(load_state, g_displayed, g_color, colorlist);
    	//var selected_circles = new L.LayerGroup(new_circles).addTo(map);
	};
});