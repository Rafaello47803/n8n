const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const allowedNames = ['Samuel', 'Lennard', 'Filip'];

rl.question('Podaj swoje imie: ', (name) => {
  if (!allowedNames.includes(name.trim())) {
    console.log('Nie zostales zaproszony do gry, twoj telefon wybuchnie za 10 sekund!');
    let count = 10;
    const countdown = setInterval(() => {
      if (count === 0) {
        clearInterval(countdown);
        console.log('BAM!');
        rl.close();
      } else {
        console.log(count);
        count -= 1;
      }
    }, 1000);
    return;
  }

  console.log(`Czesc ${name}! Witaj w Laser Tag!`);
  console.log('Gra zaraz sie rozpocznie...');

  setTimeout(() => {
    console.log('zapraszam cie na urodziny');
    rl.close();
  }, 2 * 60 * 1000);
});
