
const Themeparks = require("themeparks");

const disneyMagicKingdom = new Themeparks.Parks.DisneylandParisMagicKingdom();

const elasticsearch = require('elasticsearch');

const dateFormat = require('dateformat');

const client = new elasticsearch.Client();

const uuidv4 = require('uuid/v4');

var fs = require("fs");

var geo = fs.readFileSync('./geo.json', {encoding: "binary"});

var geo = JSON.parse(geo)

console.log(geo)

/**
	Supprime l'index ElasticSearch Disney si celui-ci existe deja
 */
client.indices.delete({
    index: 'disney',
    ignore: [404,400]
}).then(function () {
    console.log('index deleted or never existed');
    create()
}, function (error) {
    console.log(error)
});

/**
	Créer l'index ElasticSearch
 */
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
/**
	Creer et ajoute le mapping à l'index elasticSearch Disney pour les documents de type waitTime
 */
function createMapping(){
    let mapping = {"waitTime":{"properties":{"attraction":{"type":"keyword"},"dateTime":{"type":"date","format":"YYYY-MM-dd HH:mm:ss"},"attente":{"type":"integer"},"position":{"type":"geo_point"}}}}

    client.indices.putMapping({index:"disney", type:"waitTime", body:mapping, ignore: [404,400]}).then(function () {
        console.log('mapping created ');
        tid = setTimeout(getTime, 2000);
    }, function (error) {
        console.log(error)
    });
}



/**
	Recupere les temps d'attentes de chaque attractions
 */
function getTime(){
	// Recupère la date actuellemnt arrondi à la dizaine de minute inférieur
    let dateTime = new Date();
    let changeDate = Math.floor(dateTime.getTime()/(1000*60*10))*(1000*60*10);
    let formate = dateFormat(new Date(changeDate),"yyyy-mm-dd HH:MM:ss");

	// récupère chaque temps d'attentes
    disneyMagicKingdom.GetWaitTimes().then(function(rides) {
        console.log('new adding ------- '+rides.length)
        
        // Parcours les Jsons recupérés 
        for(var i=0, ride; ride=rides[i++];) {
			// Applique les filtres et récupère les positions géographiques
            let position = "0,0";
            let attraction = ride.name.replace("NOUVEAU ! ","").replace("™","").replace("®","").replace("NOUVEAU ","").replace("'NOUVEAU' ","").replace("’","'").replace(" – "," - ");
            if(attraction in geo){
                position = geo[attraction];
            }
            let result = {
                "attraction":attraction,
                "attente":ride.waitTime,
                "dateTime":formate,
                "position":position
            };
			// Ajoute à l'index
            addToES(result);
        }

    }, console.error);
	// Lance un chrono pour relancer la fonction précédente dans 10mn
    tid = setTimeout(getTime, 1000 * 60 * 10 );
}


/**
	Pousse le documents Json dans l'index
 */
function addToES(results){
     client.create({
         index: 'disney',
         type: 'waitTime',
		 // Ajoute à l'index un ID unique (Obligatoire sur JS à l'inverse de python)
         id : uuidv4(),
         body: JSON.stringify(results)
    }, function (err) {
         if(err) {
			 // Si l'ajout est refusé cela à beaucoup de chance d'être dû à un doublon d'ID, on relance donc l'ajout pour
			 // generer un nouvel ID
             addToES(results)
         }
     });
}
