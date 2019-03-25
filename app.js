
const Themeparks = require("themeparks");

const disneyMagicKingdom = new Themeparks.Parks.DisneylandParisMagicKingdom();

const elasticsearch = require('elasticsearch');

const dateFormat = require('dateformat');

const client = new elasticsearch.Client();

const uuidv4 = require('uuid/v4');

const utf8 = require('utf8');

var fs = require("fs");

var geo = fs.readFileSync('./geo.json', {encoding: "binary"});

var geo = JSON.parse(geo)

console.log(geo)


client.indices.delete({
    index: 'disney',
    ignore: [404,400]
}).then(function () {
    console.log('index deleted or never existed');
    create()
}, function (error) {
    console.log(error)
});


function create(){
    client.indices.create({
        index: 'disney',
        ignore: [404,400]
    }).then(function () {
        console.log('index created or already existed');
        createMapping()
    }, function (error) {
        console.log(error)
    });
}

var tid = null ;

function createMapping(){
    let mapping = {"waitTime":{"properties":{"attraction":{"type":"keyword"},"dateTime":{"type":"date","format":"YYYY-MM-dd HH:mm:ss"},"attente":{"type":"integer"},"position":{"type":"geo_point"}}}}

    client.indices.putMapping({index:"disney", type:"waitTime", body:mapping, ignore: [404,400]}).then(function () {
        console.log('mapping created ');
        tid = setTimeout(getTime, 2000);
    }, function (error) {
        console.log(error)
    });
}




function getTime(){
    let dateTime = new Date();
    let changeDate = Math.floor(dateTime.getTime()/(1000*60*10))*(1000*60*10);
    let formate = dateFormat(new Date(changeDate),"yyyy-mm-dd HH:MM:ss");

    disneyMagicKingdom.GetWaitTimes().then(function(rides) {
        console.log('new adding ------- '+rides.length)
        
        
        for(var i=0, ride; ride=rides[i++];) {
            let position = "0,0";
            let attraction = ride.name.replace("NOUVEAU ! ","").replace("™","").replace("®","").replace("NOUVEAU ","").replace("'NOUVEAU' ","")
            if(attraction in geo){
                position = geo[attraction];
            }else{
                console.log(attraction)
            }
            let result = {
                "attraction":attraction,
                "attente":ride.waitTime,
                "dateTime":formate,
                "position":position
            };
            console.log(result);
            addToES(result);
        }

    }, console.error);
    tid = setTimeout(getTime, 1000 * 60 * 10 );
}



function addToES(results){
     client.create({
         index: 'disney',
         type: 'waitTime',
         id : uuidv4(),
         body: JSON.stringify(results)
    }, function (err) {
         if(err) {
             addToES(results)
         }
     });
}
