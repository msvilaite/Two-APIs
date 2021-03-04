const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");

const port = 3000;
const host = "localhost";

const credentials1 = require("./auth/credentials1.json");
const credentials2 = require("./auth/credentials2.json");
const html = "./html/index.html";
const server = http.createServer();
let title = "";

server.on("request", connection);
function connection(req, res) {
    if(req.url === "/") {
        const index = fs.createReadStream(html);
		res.writeHead(200, {"Content-Type": "text/html"});
		index.pipe(res);
    }
    else if(req.url.startsWith("/search")) {
        let user_input = url.parse(req.url, true).query.title;
        zomato_call(user_input, res);
    }
    else if(req.url.startsWith("/images/")) {
        let image_stream = fs.createReadStream(`.${req.url}`);
		image_stream.on("error", image_error);
		function image_error(err){
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.end("404 Not Found");
		}
		image_stream.on("ready", show_image);
		function show_image(){
			res.writeHead(200, {"Content-Type": "image/jpeg"});
			image_stream.pipe(res);
		}
    }
    else {
        res.end("404 Not Found");
    }
}

function zomato_call (user_input, res) {
    const zomato_cities_query = "https://developers.zomato.com/api/v2.1/cities?q=";
        const zomato_collections_query = "https://developers.zomato.com/api/v2.1/collections?city_id="
        https.get(`${zomato_cities_query}${user_input}`, {headers: credentials1}, function(cities_stream) {
            let cities_data = "";
            cities_stream.on("data", (chunk) => cities_data += chunk);
            cities_stream.on("end", function () {
                let cities_json = JSON.parse(cities_data);
                if(cities_json.location_suggestions==0) {
                    res.end("404 Not Found, go back to home page and try another city");
                    return;
                }
                const cityId = cities_json.location_suggestions[0].id;
                console.log(cityId);
                https.get(`${zomato_collections_query}${cityId}`, {headers: credentials1}, function(collections_stream) {
                    let collections_data = "";
                    collections_stream.on("data", (chunk) => collections_data += chunk);
                    collections_stream.on("end", function () {
                    let collections_json = JSON.parse(collections_data);
                    if (collections_json.collections==undefined) {
                        res.end("404 Not Found, go back to home page and try another city");
                        return;
                    }
                    else{
                        const collection_title = collections_json.collections[1].collection.title;
                        console.log(collection_title);
                        title = collection_title;                     
                        pexels_call(collection_title, res);
                    }
                    });
                });
            });
        });
}

function pexels_call (collection_title, res) {
    const pexels_query = "https://api.pexels.com/v1/search?query=";
    https.get(`${pexels_query}${collection_title}`, {headers: credentials2}, function(photos_stream) {
        let photos_data = "";
        photos_stream.on("data", (chunk) => photos_data += chunk);
        photos_stream.on("end", function () {
            let photos_json = JSON.parse(photos_data);
            console.log(photos_json.photos[0].src.original); // URL of the first image
            console.log(photos_json.photos.length);         // 15 by default
            download_images(photos_json, res);
        });
    });
}

function download_images(photos_json, res) {
    let counter = 0;
    let array_of_image_paths = [];
    for (let i=0; i<photos_json.photos.length; i++) {       // loops 15 times
        let request_image = https.get(photos_json.photos[i].src.original, function(image_res){
            let url_string = photos_json.photos[i].src.original;
            let image_name = url_string.substring(url_string.length-11);
            let image_path = `./images/${image_name}`;
            console.log(image_path);
            array_of_image_paths.push(image_path);
            let new_image = fs.createWriteStream(image_path, {'encoding':null});
            image_res.pipe(new_image);
            new_image.on("finish", function() {
                counter++;
                if (counter===photos_json.photos.length) {
                    serve_image_webpage(array_of_image_paths, res);
                }
            });
        });
        request_image.on("error", function(err){console.log(err);});
    }
}

function serve_image_webpage(array_of_image_paths, res) {
    let output = array_of_image_paths.map((path) => `<img src="${path}" width="250" height="250">`).join("");
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(`<h1>${title}</h1>${output}`);
}


server.listen(port, host);
console.log(`Now Listening on ${host}:${port}`);