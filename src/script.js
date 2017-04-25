let data = [];
let loading = document.querySelector('.loading');

let placesList = {};
let categoriesList = [];

init();

/* Init */

function init() {
  console.clear();
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

const places = {
  'aleja': 'Q207934',
  'baszta': 'Q81917',
  'budynek': 'Q41176',
  'cerkiew': 'Q2031836',
  'cmentarz': 'Q39614',
  'dom': 'Q3947',
  'dwór': 'Q16974307',
  'dzwonnica': 'Q200334',
  'grobowiec': 'Q381885',
  'kamienica': 'Q1723032',
  'kaplica': 'Q108325',
  'klasztor': 'Q44613',
  'kostnica': 'Q6451172',
  'kościół': 'Q16970',
  'młyn': 'Q185187',
  'obora': 'Q681337',
  'oficyna': 'Q488654',
  'park': 'Q22698',
  'pałac': 'Q16560',
  'pensjonat': 'Q1065252',
  'pomnik': 'Q4989906',
  'ratusz': 'Q543654',
  'spichrz': 'Q114768',
  'spichlerz': 'Q114768',
  'stajnia': 'Q214252',
  'stajnie': 'Q214252',
  'synagoga': 'Q34627',
  'ujeżdżalnia': 'Q415917',
  'wieża': 'Q12518',
  'wieża ciśnień': 'Q274153',
  'willa': 'Q3950',
  'wozownia': 'Q9377898',
  'zamek': 'Q23413',
  'zespół budynków': 'Q1497364',
  'zespół cmentarza': 'Q19691007',
  'zespół dworski': 'Q28843623',
  'zespół dworsko-parkowy': 'Q28843623',
  'zespół parkowo-dworski': 'Q28843623',
  'zespół fabryczny': 'Q1497364',
  'zespół kościoła': 'Q19691007',
  'zespół parkowy': 'Q4156067',
  'zespół parkowo-pałacowy': 'Q4156067',
  'zespół pałacowo-parkowy': 'Q4156067',
  'zespół willi': 'Q1497364',
  'zespół klasztorny': 'Q1497364',
  'zespół cerkwi': 'Q19691007',
};

function normalizeName(monument) {
  const regex = /((p?ok?\.? )?([12][0-9]{3}(-[12][0-9]{3})?( r\.)?)|(([12] poł\. )?(l\. [1-9]0\.?[- ]([1-9]0\.? )?)?(kon\.? )?(pocz\.? )?([VIX]{1,5}\/)?[VIX]{1,5}( w\.)?))/g;
  const nameParts = monument.name.split(', ').map(part => ({ text: part, match: part.match(regex) }));

  let name = nameParts.filter(part => !part.match).map(part => part.text.trim()).join(', ');
  name = name[0].toUpperCase() + name.slice(1);
  name = name.replace('par.', '').replace('fil.', '').replace(/p\.?w./g, '').replace(/ +/g, ' ');
  monument.name = name;

  Object.keys(places).forEach((element) => {
    if (name.toLowerCase().includes(element)) {
      monument.type = places[element];
    }
  });

  let dates = nameParts.filter(part => part.match).map(part => part.text.trim());
  monument.date = dates.length ? dates[0] : undefined;
}

function normalizeRegNumber(monument) {
  const regex = /([0-9a-zA-Z\.\/\-]*)( z | i z | i |, |, z )([0-9]{1,2}.[0-9]{1,2}.[0-9]{4})*/g;
  monument.reg = monument.reg
    .split(';')
    .map(number => number.trim())
    .map((number) => {
      regex.lastIndex = 0;
      const matches = regex.exec(number);
      if (!matches) { return undefined; }

      let date;
      if (matches && matches.length === 4) {
        const rawDate = matches[3];
        const parts = rawDate.split('.');
        if (parts.length === 3) {
          date = `+${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z/11`;
        }
      }

      return {
        _raw: number,
        number: matches[1],
        date,
      };
    });

  console.log(monument);
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

    normalizeName(monument);

    // console.info(monument);
    monument.gmina = monument.gmina.replace('gmina ', '');
    monument.powiat = monument.powiat.replace('powiat ', '');
    monument.town = normalizeTown(monument);
    monument.address = monument.address.replace(/[Uu]l\.? /g, '').replace(/[Aa]l\.? /g, 'aleja');

    if (monument.coords.includes('NULL')) {
      monument.coords = undefined;
    }

    normalizeRegNumber(monument);

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
    if (categoriesList.includes(monument.commons)) {
      numbers.categoryTaken += 1;
      query.push('---------- DUPLICATED (CATEGORY) ----------');
    }
    if (!monument.placeId) {
      numbers.noPlaceId += 1;
    }

    query.push(`LAST\tLpl\t${monument.name}`);
    query.push('LAST\tP17\tQ36');
    addLine(query, 'P31', monument.type, monument.type);
    addLine(query, 'P131', monument.placeId, monument.placeId);
    addLine(query, 'P969', monument.address);
    query.push('LAST\tP1435\tQ21438156');
    monument.reg.forEach((number) => {
      if (number && number.number) {
        addLine(query, 'P3424', number.number, `"${number.number}"\tP585\t${number.date}`);
      }
    });
    addLine(query, 'P2186', monument.id, `"PL-${monument.id}"`);
    addLine(query, 'P571', monument.date);
    addLine(query, 'P625', monument.coords);
    addLine(query, 'P18', monument.photo);
    addLine(query, 'P373', monument.commons);
    return query.join('\n');
  });
}

function addLine(query, property, value, valuePaste) {
  if (value) {
    query.push(`LAST\t${property}\t${valuePaste || '"' + value + '"'}\tS143\tQ28563569`);
  }
}
