// --------------------------------------- NETWORKED MEDIA FINAL ---------------------------------------
var exif = require('exif-parser');
var thumb = require('node-thumbnail').thumb;

app.get('/photo-genic', function(req, res){
  res.redirect("nm-final/index.html");
 });

// ---------- IMAGE UPLOAD ----------
app.post('/photo-genic-submit', submitPhoto.single('imageupload'), function (req, res) {
 // VERIFY AND RENAME
 let fileRoute;
 if (req.file.mimetype == "image/jpeg") {
   fs.renameSync(req.file.path, req.file.path + ".jpg");
   fileRoute = "nm-final/uploads/" + req.file.filename + ".jpg";
 } else if (req.file.mimetype == "image/png") {
   fs.renameSync(req.file.path, req.file.path + ".png");
   fileRoute = "nm-final/uploads/" + req.file.filename + ".png"
 } else {
   fs.unlinkSync(req.file.path);
   res.send("error");
 }

 // GENERATE THUMBNAIL
 thumb({
   source: 'public/' + fileRoute,
   destination: 'public/nm-final/uploads/thumb/',
   suffix: '',
   concurrency: 1,
   quiet: true,
   width: 128
 }, (files, err, stdout, stderr) => {
   console.log('thumbnail generated!');

   let buffer = fs.readFileSync("public/" + fileRoute);
   let parser = exif.create(buffer);
   parser.enableTagNames(true);
   let result = parser.parse();
  
   let latitude = result.tags.GPSLatitude;
   let longitude = result.tags.GPSLongitude;
  
   let locRes;
   if (latitude != undefined | longitude != undefined) {
     locRes = {
       lat: latitude,
       lon: longitude
     };
   } else {
     locRes = "NO_LOC";
   }
  
   res.send({
     filename: req.file.filename,
     url: fileRoute,
     thumburl: 'uploads/thumb/' + req.file.filename + '.jpg',  
     loc: locRes
   });
  
   photosdb.insert({
    filename: req.file.filename,
    url: fileRoute,
    thumburl: 'uploads/thumb/' + req.file.filename + '.jpg',  
    loc: locRes,
    rating: 0
   })
 });
 var stats = fs.statSync("public/" + fileRoute);
});

// ---------- VOTING ----------
app.post('/photo-genic-vote', (req, res) => {
  let filename = req.body.filename;
  let voteType = req.body.vote;
  let currentRating;
  console.log(voteType);
  photosdb.find({ filename: filename }, (err, docs) => {
    if (voteType == 'upvote'){
      currentRating = docs[0].rating + 1;
    } else {
      currentRating = docs[0].rating - 1;
    }
    console.log(currentRating);
    photosdb.update({ _id: docs[0]._id }, { $set: { rating: currentRating }}, {}, (err, docs) => {});
  })
})

// ---------- FETCH DB ----------
app.post('/photo-genic-fetch', (req, res) => {
  photosdb.find({}, (err, docs) => {
    // console.log(docs);
    res.send(docs);
  })
})
