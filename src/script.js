let data = [];
let loading = document.querySelector('.loading');

let placesList = {};
let categoriesList = [];

init();

/* Init */

function init() {
  document.getElementById('run-button').onclick = runProcessing;
  makeRequest('GET', './places.json').then((response) => {
    placesList = JSON.parse(response);
    console.info(`List of places loaded: ${Object.keys(placesList).length}`);
  });

  makeRequest('GET', './categories.json').then((response) => {
    categoriesList = JSON.parse(response).categories;
    console.info(`List of categories loaded: ${categoriesList.length}`);
  });
}

/* Main function */

function runProcessing() {
  data = document.getElementById('input').value;

  splitByRow();
  splitByField();

  normalizeObjects();
  transformToQuickStatement();
  data = data.join('\n');
  document.getElementById('output').value = data;
}

/* Functions */

/**
 * This function is used as XHR wrapper
 * @param {String} method
 * @param {String} url
 */
function makeRequest(method, url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = function success() {
      (this.status >= 200 && this.status < 300) ?
        resolve(xhr.response) :
        reject({ status: this.status, statusText: xhr.statusText });
    };
    xhr.onerror = function err() {
      reject({ status: this.status, statusText: xhr.statusText });
    };
    xhr.send();
  });
}

/**
 * This function removes wikicode from monument town
 * @param {Object} monument
 */
function normalizeTown(monument) {
  const regex = /\[\[(.*\|)?(.*)\]\]/g;
  const array = regex.exec(monument.town);
  if (array && array.length > 1) {
    return array[2];
  }
  return monument.town;
}

/**
 * This function is editing raw monument data, so it can be used for
 * QuickStatements entries
 */
function normalizeObjects() {
  data.forEach((monument) => {
    if (!monument) { return; }

    // console.info(monument);
    monument.gmina = monument.gmina.replace('gmina ', '');
    monument.powiat = monument.powiat.replace('powiat ', '');
    monument.town = normalizeTown(monument);

    if (monument.coords.includes('NULL')) {
      monument.coords = undefined;
    }

    const nameParts = monument.name.split(', ');
    monument.name = nameParts[0];
    monument.date = nameParts[1];

    const placeCode = `${monument.town}@${monument.gmina}@${monument.powiat}`;
    monument.placeId = placesList[placeCode] ? placesList[placeCode] : '';
  });
}

function splitByField() {
  data = data.map((element) => {
    if (!element.trim()) { return false; }

    const array = element.split('\t');
    return {
      id: array[0].trim(),
      powiat: array[2],
      gmina: array[3],
      town: array[4],
      reg: array[5],
      complex: array[6],
      name: array[7],
      address: array[8],
      coords: `@${array[9]}/${array[10]}`,
      photo: array[12],
      commons: array[13],
    };
  });
}

function splitByRow() {
  data = data.split('\n');
}

function transformToQuickStatement() {
  const numbers = {
    total: data.length,
    noPlaceId: 0,
    categoryTaken: 0,
  };

  data = data.map((monument) => {
    const query = ['\nCREATE'];
    if (monument.name) { query.push(`LAST	Lpl	"${monument.name}"	S143	Q28563569`); }
    query.push('LAST	P17	Q36');
    if (monument.placeId) {
      query.push(`LAST	P131	${monument.placeId}	S143	Q28563569`);
    } else {
      numbers.noPlaceId += 1;
    }
    query.push('LAST	P1435	Q21438156');
    if (monument.id) { query.push(`LAST	P2186	"PL-${monument.id}"	S143	Q28563569`); }
    if (monument.coords) { query.push(`LAST	P625	${monument.coords}	S143	Q28563569`); }
    if (monument.commons) {
      if (categoriesList.includes(monument.commons)) { numbers.categoryTaken += 1; }
      else { query.push(`LAST	P373	"${monument.commons}"`); }
    }
    return query.join('\n');
  });
  console.log(numbers);
}
