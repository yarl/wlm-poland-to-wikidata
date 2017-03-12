document.getElementById('run-button').onclick = runProcessing;

let data = [];
let loading = document.querySelector('.loading');

/* Main function */

function runProcessing() {
  loading.classList.remove('hidden');
  data = document.getElementById('input').value;

  splitByRow();
  splitByField();

  normalizeObjects();
  getWikidataTowns()
    .then((response) => {
      console.log('response', response);
      loading.classList.add('hidden');
    });
  transformToQuickStatement();
  data = data.join('\n');
  document.getElementById('output').value = data;
}

/* Functions */

function getListOfTowns() {
  const list = [];
  data.forEach((monument) => {
    const place = `${monument.town}@${monument.gmina}`;
    if (!list.includes(place)) {
      list.push(place);
    }
  });
  return list;
}

function getTownId(townName, gminaName) {
  const endpoint = '//query.wikidata.org/sparql?query=';
  let query = `SELECT DISTINCT ?place ?placeLabel WHERE {
  { ?place wdt:P31 wd:Q515 } UNION { ?place wdt:P31 wd:Q3558970 } .
  ?place wdt:P17 wd:Q36; wdt:P131 ?gmina .
  ?place rdfs:label ?placeLabel .
  ?gmina rdfs:label ?gminaLabel
  FILTER(LANG(?placeLabel) = "pl") .
  FILTER(LANG(?gminaLabel) = "pl") .
  FILTER(STR(?placeLabel) = "${townName}") .
  FILTER(STRENDS(?gminaLabel, "${gminaName}")).
}`;
  query = encodeURIComponent(query).replace(/%20/g, '+');
  return makeRequest('GET', endpoint + query);
}

function getWikidataTowns() {
  const list = getListOfTowns();
  const promises = list.map((place) => {
    const split = place.split('@');
    return getTownId(split[0], split[1]);
  });
  const pairs = {};
  return Promise.all(promises)
    .then((response) => {
      response = response.map(re => JSON.parse(re).results.bindings);
      list.forEach((element, index) => {
        pairs[element] = response[index];
      });
      return pairs;
    })
    .catch(err => err);
}

function makeRequest(method, url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Accept','application/json');
    xhr.onload = function success() {
      (this.status >= 200 && this.status < 300) ?
        resolve(xhr.response) :
        reject({ status: this.status, statusText: xhr.statusText });
    };
    xhr.onerror = function err() {
      reject({ status: this.status, statusText: xhr.statusText })
    };
    xhr.send();
  });
}

function normalizeGmina(monument) {
  // console.log(monument)
  monument.gmina = monument.gmina.replace('gmina ', '');
}

function normalizeName(monument) {
  const parts = monument.name.split(', ');
  monument.name = parts[0];
  monument.date = parts[1];
}

function normalizeTown(monument) {
  const regex = /\[\[(.*\|)?(.*)\]\]/g;
  const array = regex.exec(monument.town);
  if (array && array.length > 1) {
    monument.town = array[2];
  }
}

function normalizeObjects() {
  data.forEach((monument) => {
    normalizeGmina(monument);
    normalizeName(monument);
    normalizeTown(monument);
  });
}

function splitByField() {
  data = data.map((element) => {
    const array = element.split('\t');
    return {
      id: array[0],
      gmina: array[3],
      town: array[4],
      reg: array[5],
      complex: array[6],
      name: array[7],
      address: array[8],
      coords: `${array[9]}/${array[10]}`,
      photo: array[12],
      commons: array[13],
    };
  });
}

function splitByRow() {
  data = data.split('\n');
}

function transformToQuickStatement() {
  data = data.map(monument => `CREATE
LAST	Lpl "${monument.name}"	S143	Q28563569
LAST	P17	Q36
LAST	P1435	Q21438156
LAST	P131 "${monument.town}"	S143	Q28563569
 `);
}
