
var fs = require('fs'),
    // path is "../" since splat.js is in routes/ sub-dir
    config = require(__dirname + '/../config'),  // port#, other params
    express = require("express"),
    url = require("url");

// Implemention of splat API handlers:

// "exports" is used to make the associated name visible
// to modules that "require" this file (in particular app.js)

// heartbeat response for server API
exports.api = function(req, res){
  res.status(200).send('<h3>Heroz API is running!</h3>');
};

exports.playMovie = function(req, res) {
    // compute absolute file-system video path from __dirname and URL with id
    MovieModel.findById(req.params.id, function(err, movie) {
        if (err) {
            res.status(500).send("Sorry, unable to retrieve movie trailer"
                +err.message+ ")" );
        } else if (!movie) {
            res.status(404).send("Sorry, that movie doesn't exist; try reselecting from Browse view");
        } else {
            if(movie.trailer==''){
                res.status(404).send('movie trailer undefiend' );
            }else {
                var file = __dirname + '/..'+config.videoPath + movie.trailer;// ADD CODE
                // get HTTP request "range" header, and parse it to get starting byte position
                var range = req.headers.range; // ADD CODE to access range header
                var pos = range.split("=")[1].split('-');
                var start = Number(pos[0]); // ADD CODE to compute starting byte position

                // get a file-stats object for the requested video file, including its size
                fs.stat(file, function (err, stats) {
                    // set end position from range header or default to video file size
                    if(stats){
                        if (pos[1] == '') {
                            var end = Number(stats.size) - 1;// ADD CODE

                        } else {
                            var end = Number(pos[1]);// ADD CODE
                        }
                        // set chunksize to be the difference between end and start values +1

                        // send HTTP "partial-content" status (206) together with
                        // HTML5-compatible response-headers describing video being sent
                        res.writeHead(206, {
                            'Content-Range': 'bytes ' + start + '-' + end + "/" + stats.size,
                            'Content-length': end - start,
                            'Accept-Ranges': 'bytes',
                            'Content-Type': 'video/mp4'
                            // ADD CODE - see tutorial 7 classroom slide #22
                        });

                        // create ReadStream object, specifying start, end values computed
                        // above to read range of bytes rather than entire file
                        var stream = fs.createReadStream(file, {start: start, end: end})
                            // when ReadStream is open
                            .on("open", function () {
                                stream.pipe(res);
                                // use stream pipe() method to send the HTTP response object,
                                // with flow automatically managed so destination is not overwhelmed
                                // ADD CODE
                                // when error receiving data from stream, send error back to client.
                                // stream is auto closed
                            }).on("error", function (err) {
                                res.status(500).send("Sorry, unable to retrieve movie trailer"
                                    + err.message + ")");
                            });

                    }else{
                        res.status(404).send('movie trailer not found' );
                    }
                });
            }
        }
    });


};

exports.addMovie = function(req, res){
    var movie= new MovieModel(req.body);
    var Image = movie['poster'];
    var posterUrl = uploadImage(Image,movie._id);
    movie.poster = posterUrl;
    movie.save(function(err,movie){
    if (err) {
        res.status(500).send("Sorry, unable to add movie at this time (" 
            +err.message+ ")" );
    } else if (!movie) {
        res.status(404).send("Sorry, that movie already exist");
    } else {
        res.status(200).send(movie);
    }
    });
};

exports.addReview = function(req, res){
    var review= new ReviewModel(req.body);
    console.log(review);
    review.save(function(err,review){
        if (err) {
            res.status(500).send("Sorry, unable to add review at this time ("
                +err.message+ ")" );
        } else if (!review) {
            res.status(404).send("Sorry, review error");
        } else {
            //review sucessfully add. modify the movie model freshness
            MovieModel.findById(review.movieId, function(err, movie) {
                if (err) {
                    res.status(500).send("Sorry, unable to retrieve movie at this time ("
                        +err.message+ ")" );
                } else if (!movie) {
                    res.status(404).send("Sorry, that movie doesn't exist; try reselecting from Browse view");
                } else {
                    movie.freshTotal=movie.freshTotal+1;
                    movie.freshVotes=movie.freshVotes+review.freshness;
                    var score=(movie.freshVotes/movie.freshTotal *100);
                    if(movie.freshTotal!=0){
                        movie.scoreVotes=score.toFixed(0)+'%('+movie.freshTotal+')';
                        if(score>=50){
                            movie.scoreImg='img/fresh_lg.png';
                        }
                        else{
                            movie.scoreImg='img/rotten_lg.png';
                        }
                    }
                    movie.save(function(serr,movie){
                        if(serr){
                            res.send("something wrong to add");
                        }else{
                            res.status(200).send(review);
                        }
                    });
                }
            });

        }
    });
};

// retrieve an individual movie model, using it's id as a DB key
exports.getMovie = function(req, res){
    MovieModel.findById(req.params.id, function(err, movie) {
        if (err) {
            res.status(500).send("Sorry, unable to retrieve movie at this time (" 
                +err.message+ ")" );
        } else if (!movie) {
            res.status(404).send("Sorry, that movie doesn't exist; try reselecting from Browse view");
        } else {
            res.status(200).send(movie);
        }
    });
};

exports.getMovies = function(req, res){
    MovieModel.find({}, function(err,movies){
        if (err) {
              res.send(404, "Sorry, no movies were found! ("
                  +err.message+ ")" );
           } else {
              res.status(200).send(movies);
           }
    });
};

exports.getReviews = function(req, res){
    console.log(req.params);
    ReviewModel.find({movieId: req.params.id}, function(err,reviews){
        if (err) {
            res.send(404, "Sorry, no movies were found! ("
                +err.message+ ")" );
        } else {
            console.log(reviews);
            res.status(200).send(reviews);
        }
    });
};

exports.editMovie = function(req, res){
    MovieModel.findById(req.params.id, function(err, movie) {
        if (err) {
              res.send(404, "Sorry, no movies were found! ("
                  +err.message+ ")" );
           }else if(!movie){
                res.send(404, "Sorry, no movies were found!" );
            }else {
            for(var attr in req.body){
               movie[attr]=req.body[attr];
            }
            var Image = movie['poster'];
            var posterUrl = uploadImage(Image,movie._id);
            movie.poster = posterUrl;
            console.log(movie);
            movie.save(function(serr,movie){
                    if(serr){
                        res.send("something wrong to add");
                    }else{
                        res.send(movie);
                    }
                });
           }
    });
};

exports.deleteMovie = function(req, res){
    MovieModel.findById(req.params.id, function(err, movie) {
                    console.error(err);
        if(err){
            res.send(500, "Error with finding this movie");
        }else if(!movie){
                res.send(404, "Sorry, no movies were found!" );
            }else{
            movie.remove(function(err){
                if(!err){
                    console.log(req.params.id+"movie delete success");
                    res.status(200).send(movie);
                }else{
                    console.log(req.params.id+"movie delete fail");
                    res.send(404,"cannot delete this movie");
                }
            })
        }
    });
};
// NOTE, you would use uploadImage only if you chose to implement
// image-upload using Blobs with the HTML5 API.  If instead your
// server saves images directly from your model's poster value,
// you do NOT need the uploadImage route handler

// upload an image file; returns image file-path on server

function uploadImage(imagePoster, id) {
    if(imagePoster.indexOf("data:")==0){
        var data=imagePoster.split(",")[1],
            suffix="."+imagePoster.split(",")[0].split(";")[0].split("/")[1],
            encodeType=imagePoster.split(",")[0].split(";")[1],
            imageURL = 'img/uploads/' + id + suffix,
            // rename the image file to match the imageURL
            newPath = __dirname + '/../public/' + imageURL;

        var buf = new Buffer(data, encodeType);

        fs.writeFile(newPath, buf, function(err) {
            console.log(err); // writes out file without error, but it's not a valid image
        });
        return imageURL;
    }
    return imagePoster;
};

var mongoose = require('mongoose'); // MongoDB integration

// Connect to database, using credentials specified in your config module
mongoose.connect(config.db);

// Schemas
var MovieSchema = new mongoose.Schema({
    title:{ type: String, required:true},
    released:{ type: Number, required:true},
    director:{ type: String, required:true},
    starring:{ type: [String], required:true},
    rating:{ type: String, required:true},
    duration:{ type: Number, required:true},
    genre:{ type: [String], required:true},
    synopsis:{ type: String, required:true},
    poster:{ type: String, required:true},
    dated:{ type: String, required:true},
    trailer:{ type: String, required:false},
    freshTotal:{ type: Number, required:true},
    freshVotes:{ type: Number, required:true},
    scoreVotes:{ type: String, required:true},
    scoreImg:{ type: String, required:true},
    // ADD CODE for other Movie attributes
});

var ReviewSchema = new mongoose.Schema({
    freshness: {type: Number, required: true},
    reviewName:{type: String, required: true},
    reviewAffil:{type: String, required: true},
    reviewText:{type: String, required: true},
    movieId:{type: String, required: true},
    reviewImg:{type: String, required: true},
});


// Constraints
// each title:director pair must be unique; duplicates are dropped
MovieSchema.index({title:1, director:1},{unique: true});  // ADD CODE
ReviewSchema.index({reviewName:1, reviewAffil:1},   {unique: true});
// Models
var MovieModel = mongoose.model('Movie', MovieSchema);

var ReviewModel = mongoose.model('Review', ReviewSchema);