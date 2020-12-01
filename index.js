const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

//allows heroku to choose port it wants
app.listen(process.env.PORT || 3000);

app.get("/sourcecode", (req, res) => {
  res.send(require('fs').readFileSync(__filename).toString())
})

let passwords = new Map();
let bodyParser = require('body-parser');
app.use(bodyParser.raw({ type: "*/*"}));
let tokens = new Map();
let allChannels = new Map();
var banned;
let channelUsers = new Map();
var allChannelData = [];
//array - users in channel
//array - banned from channel
//array - all channels?


//problem 1 - signup
app.post("/signup", (req,res) => {
  let parsed = JSON.parse(req.body);
  
  if (parsed.password === undefined){
    res.send({"success":false,"reason":"password field missing"})
  }
  else if (parsed.username === undefined){
    res.send({"success":false,"reason":"username field missing"})
  }
  else if (passwords.get(parsed.username) != undefined){
    res.send({"success":false,"reason":"Username exists"})
  }
  else if (passwords.get(parsed.username) === undefined){
    
    passwords.set(parsed.username, parsed.password);
    res.send({"success":true});
  }
})

//problem 2 - login
app.post("/login", (req,res) => {
  let parsed = JSON.parse(req.body);
  
  
  if (parsed.password === undefined){
    res.send({"success":false,"reason":"password field missing"})
  }
  else if (parsed.username === undefined){
    res.send({"success":false,"reason":"username field missing"})
  }
  else if (passwords.get(parsed.username) === undefined){
    res.send({"success":false,"reason":"User does not exist"})
  }
  else if (passwords.get(parsed.username) != parsed.password){
    res.send({"success":false,"reason":"Invalid password"})
  }
  else if (passwords.get(parsed.username) === parsed.password){  
    //NEED TO GENERATE UNIQUE TOKEN
    let d = new Date();
    let uniqueToken = parsed.username + d.getTime();
    //NEED TO LOGIN USER - can I just use a token?
    tokens.set(uniqueToken, parsed.username);
    res.send({"success":true,"token": uniqueToken});
  }
})

//problem 3 - create-channel
app.post("/create-channel", (req, res) => {
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  //NEED TO HAVE LIST ALL EXISTING CHANNELS
  
  //if token header missing
  if (req.header('token') === undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //if channel name missing
  else if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  //if token invalid
  //NEED TO COMPARE HEADER TO TOKENS ALREADY EXISTING - map
  else if (tokens.get(req.header('token')) === undefined){
      
      console.log("token: " + req.header('token'));
      console.log(tokens.get(req.header('token')));
      res.send({"success":false,"reason":"Invalid token"});
      }
  //if channel exists already
  else if (allChannels.get(channelName) != undefined){
    res.send({"success":false,"reason":"Channel already exists"});
  }
  else {
    //CREATE NEW CHANNEL
    //use map to relate channelname and userName
    allChannels.set(channelName, tokens.get(req.header('token')));
    allChannelData.push({"name": channelName, 
                         "owner": tokens.get(req.header('token')), 
                         "banned": [],
                         "users": [],
                         "messages": []});
   
    res.send({"success":true});
    console.log("Creating channel: " + channelName + " with user " + tokens.get(req.header('token')));
  }
})

//function to check if user in channel?
var inChannel;
inChannel = (channelName, requestedUser) =>{
  
  //console.log("seeing if user " + requestedUser + " is in channel" + channelName);
  //console.log("allChannelData.length = " + allChannelData.length);
  
 for (let i=0; i<allChannelData.length; i++){
        //console.log ("Checking where i = " + i + " and allChannelData[i].name =" + allChannelData[i].name);
      if (allChannelData[i].name === channelName){
        //console.log("found matching channels!" + allChannelData[i].name + " = " + channelName);
      //each channel needs an array storing all userNames 
        
        for (let j=0; j<allChannelData[i].users.length; j ++ ){
          
            //console.log("checking if user: " + allChannelData[i].users[j] + " is " + requestedUser);
            if (allChannelData[i].users[j] === requestedUser){
              //console.log("User was already in!")
              return true;
            }
        }
      
      }
    
  }
  return false;
}
  
var isBanned;
isBanned = (channelName, requestedUser) => {
  
   for (let i=0; i<allChannelData.length; i++){
  
      if (allChannelData[i].name === channelName){
        //console.log("found " + allChannelData[i].name + " = " + channelName);
      //each channel needs an array storing all userNames 
        
        for (let j=0; j<allChannelData[i].banned.length; j ++ ){
          
            //console.log("checking banned:" + allChannelData[i].users[j]);
            
            if (allChannelData[i].banned[j] === requestedUser){
             return true;
              //console.log("User banned!");
            }
        }
      
      }
    }
  return false;
}  




//problem 4 - join-channel
app.post("/join-channel", (req, res) => {
  
  
  
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let requestedUser = tokens.get(req.header('token'));
  console.log ("requestedUser: "  + requestedUser);
  
  //channel name missing
  if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  // if token undefined
  else if (req.header('token') === undefined) {
    res.send({"success":false,"reason":"token field missing"});
  }
  //token does not point to user
  else if (requestedUser === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //channel not in allChannels
  else if (allChannels.get(channelName) === undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  else if (inChannel(channelName, requestedUser)){
    res.send({"success":false,"reason":"User has already joined"});
  }
  else if (isBanned(channelName, requestedUser)){
      res.send({"success":false,"reason":"User is banned"});
  }
  else {
    for (let i = 0; i< allChannelData.length; i++){
      if (allChannelData[i].name === channelName ){
          allChannelData[i].users.push(requestedUser);
        
          res.send({"success":true});
          console.log(requestedUser + " has joined channel " + channelName);
          }
    }
  }
})

//problem 5 - leave-channel
app.post("/leave-channel", (req, res) => {
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let requestedUser = tokens.get(req.header('token'));
  
  // if token undefined
  if (req.header('token') === undefined) {
    res.send({"success":false,"reason":"token field missing"});
  }
  //token does not point to user
  else if (requestedUser === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //channel name missing
  else if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  //channel not in allChannels
  else if (allChannels.get(channelName) === undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  //if user hadn't joined channel
  else if (!inChannel(channelName, requestedUser)){ 
    res.send({"success":false,"reason":"User is not part of this channel"});
  }
  else {
    //REMOVE USER FROM CHANNEL
    for (let i=0; i<allChannelData.length; i++){
      if (allChannelData[i].name === channelName){
        for (let j=0; j<allChannelData.length; j++){
          if (allChannelData[i].users[j] === requestedUser){
            delete allChannelData[i].users[j];
          }
        }
      }
    }
    console.log(requestedUser + " has left channel " + channelName);
    res.send({"success":true});
  }
})

//problem 5 - joined
app.get("/joined", (req, res) => {
  let requestedChannel = req.query.channelName;
  let user = tokens.get(req.header('token'));
  
  if (allChannels.get(requestedChannel) === undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  else if (req.header('token') === undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //token does not point to user
  else if (user === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //if user is not in channel 
  else if (!inChannel(requestedChannel, user)){
    res.send({"success":false,"reason":"User is not part of this channel"});
  }
  //take channel name and add to channel users
  else {
    for (let i=0; i<allChannelData.length; i++){
       if (allChannelData[i].name === requestedChannel){
         let allUsers = allChannelData[i].users;
         console.log("allUsers: " + allUsers); 
         res.send({"success":true,"joined":allUsers});
      }
      
    }
  }
})

//problem 6 - delete
app.post("/delete", (req, res) => {
  let user = tokens.get(req.header('token'));
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  
  //token header missing
  if (req.header('token')=== undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //token header invalid
  else if (user === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //channelName missing
  else if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  //channelName invalid
  else if (allChannels.get(channelName)=== undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  //delete
  else {
    for (let i=0; i<allChannelData.length; i++){
      if (allChannelData[i].name === channelName){
        allChannelData.splice(i, 1);
        allChannels.delete(channelName);
        console.log("deleting channel " + channelName + "Verification: " + allChannels.get(channelName));
        res.send({"success":true});
      }
    }
  }
  
})

//problem 7 - kick
app.post("/kick", (req, res) => {
  let user = tokens.get(req.header('token'));
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let kicked = parsed.target;
  
  //token header missing
  if (req.header('token')=== undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //token header invalid
  else if (user === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //channelName missing
  else if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  //target missing
  else if (kicked === undefined){
    res.send({"success":false,"reason":"target field missing"});
  }
  //channelName invalid
  else if (allChannels.get(channelName)=== undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  else if (allChannels.get(channelName) != user){
    res.send({"success":false,"reason":"Channel not owned by user"});
  }
  else{
    for (let i = 0; i<allChannelData.length; i++){
      if (allChannelData[i].name === channelName){
        for (let j = 0; j<allChannelData[i].users.length; j++){
          if (allChannelData[i].users[j] === kicked){
            allChannelData[i].users.splice(j, 1);
            console.log("kicked user " + kicked + " from channel " + channelName);
            res.send({"success":true});
          }
        }
        
      }
    }
  }
  
  
  
})

//problem 8 - ban
app.post("/ban", (req, res) => {
  let user = tokens.get(req.header('token'));
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let banned = parsed.target;
  
  //token header missing
  if (req.header('token')=== undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //token header invalid
  else if (user === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //channelName missing
  else if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  //target missing
  else if (banned === undefined){
    res.send({"success":false,"reason":"target field missing"});
  }
  //channelName invalid
  else if (allChannels.get(channelName)=== undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  else if (allChannels.get(channelName) != user){
    res.send({"success":false,"reason":"Channel not owned by user"});
  }
  else{
    for (let i = 0; i<allChannelData.length; i++){
      if (allChannelData[i].name === channelName){
       allChannelData[i].banned.push(banned);
       console.log("banned " + banned + " from " + channelName); 
        res.send({"success":true});
      }
    }      
  }
})

//problem 9 - message
app.post("/message", (req, res) => {
  let user = tokens.get(req.header('token'));
  let parsed = JSON.parse(req.body);
  let channelName = parsed.channelName;
  let contents = parsed.contents;
  
  //token header missing
  if (req.header('token')=== undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //token header invalid
  else if (user === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //channelName missing
  else if (channelName === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  //if user not part of channel
  else if (!inChannel(channelName, user)){
    res.send({"success":false,"reason":"User is not part of this channel"});
  }
  else if (contents === undefined){
    res.send({"success":false,"reason":"contents field missing"});
  }
  else {
    for (let i=0; i<allChannelData.length; i++){
      if (allChannelData[i].name === channelName){
       allChannelData[i].messages.push({"from":user,"contents":contents});
        console.log("Adding message to " + channelName + " : " + contents);
      res.send({"success":true}); 
      }
    }
  }
  
})

//problem 10 - messages
app.get("/messages", (req, res) => {
  let requestedChannel = req.query.channelName;
  let user = tokens.get(req.header('token'));
  
  if (requestedChannel === undefined){
    res.send({"success":false,"reason":"channelName field missing"});
  }
  else if (allChannels.get(requestedChannel) === undefined){
    res.send({"success":false,"reason":"Channel does not exist"});
  }
  else if (req.header('token') === undefined){
    res.send({"success":false,"reason":"token field missing"});
  }
  //token does not point to user
  else if (user === undefined){
    res.send({"success":false,"reason":"Invalid token"});
  }
  //if user is not in channel 
  else if (!inChannel(requestedChannel, user)){
    res.send({"success":false,"reason":"User is not part of this channel"});
  }
  //print messages
  else {
    for (let i=0; i<allChannelData.length; i++){
       if (allChannelData[i].name === requestedChannel){
         let allMessages = allChannelData[i].messages;
         console.log("allMessages: " + allMessages); 
         res.send({"success":true,"messages":allMessages});
      }
      
    }
  }
})