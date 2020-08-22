const fs = require('fs');
const pdf = require('pdf-parse');
 
let dataBuffer = fs.readFileSync('./src/build/production.pdf');

const rgxs = {
  dots: /(\\n|[.]{14,16})/g,
  bar: /(Barra\n)/g,
  dotsSeparator: /(Todos\n)/g,
  category: /(Grupo:)/g,
  subtitles: /(\nCódigoUNEstoque DescriçãoIdealMínimoCód )/g,
  title: /(MIGRAÇÃO NÍVEL 1)/g,
}

const strs = {
  stock: 'Local de Estoque:',
  version: 'SIGNAPOS AUTOMAÇÃO DE POSTOS - VERSÃO 20.2.2.1',
  headers: 'CódigoUNEstoque DescriçãoIdealMínimoCód Barra',
  total: ' totais:',
  totalGroup: 'totais grupo:',
  unit: 'UN',
  code1: 'C11860ZPUN',
  code2: '7891028126772UN',
}

function print(params) {
  console.log('===============================');
  console.log(params);
  console.log('===============================');
}

pdf(dataBuffer).then(function(data) {
  const x = data.text.split(rgxs.category).filter(e => e !== 'Grupo:');
  
  // separete products by categories
  const y = x.map(row => {
    const response = row.split(rgxs.dotsSeparator).filter(e => e !== 'Todos\n');
    
    if (response.length === 1) {
      const [xy] = response;
      return xy.split(rgxs.bar).filter(e => e !== 'Barra\n' && !e.match(rgxs.subtitles));
    }

    return response.map(e => {
      const r = e.replace(rgxs.dots, '').split('\n').filter(e => e.length);

      if (!r.includes(strs.version)) {
        return r.filter(e => e !== strs.headers && e !== strs.totalGroup);
      }
      
      return r.slice(0, r.indexOf(strs.version)).concat(r.slice(r.indexOf(strs.stock), r.length));
    });
  });
  
  const names_trash = [];
  const details = [];
  
  // separete products by name and details (two distinct arrays)
  y.forEach(e => {
    if (e.length > 1) {
      e.forEach(ev => {
        if (ev.indexOf(strs.stock) > 0) {
          const a = ev.slice(ev.indexOf(strs.stock) + 1, ev.length); // names
          const b = ev.slice(0, ev.indexOf(strs.stock)); // details

          b.forEach(item => details.push(item));
          a.forEach(item => names_trash.push(item));
        } else {
          ev.forEach(item => names_trash.push(item));
        }
      })
    } else {
      const a = e[0].split(/\n/g).filter(e => e.length);
      a.forEach(e => names_trash.push(e));
    }
  });
  
  // limpa por várias strings sem sentido
  const names = names_trash.filter(e => (
    !e.match(rgxs.title)
    && e !== strs.totalGroup
    && e !== strs.total
    && e !== strs.headers
    && e !== strs.unit
    && e !== strs.code1
    && e !== strs.code2
  ));

  // print(names.length);
  // print(details.length);

  fs.writeFile('names.json', JSON.stringify(names), () => print('Names are done!'));
  fs.writeFile('details.json', JSON.stringify(details), () => print('Details are done!'));
});
