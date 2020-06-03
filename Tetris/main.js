'use strict';

const extraFuncs = require('./extraConstructions.js');

const EventEmitter = extraFuncs.SimpleEventEmitter;
const hideLoops = extraFuncs.hideLoops;
const random = extraFuncs.random;

const typeFigures = [
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 0]
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [0, 0, 0]
  ],
  [
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]
];


const shapeFigures = [
  '\x1b[31m[]',  // RED
  '\x1b[32m[]',  // Green
  '\x1b[33m[]',  // Yellow
  '\x1b[34m[]',  // Blue
  '\x1b[35m[]',  // Purple
];

// Повертає ціле значення від 0 до 4
// (використовується для shapeFigures i typeFigures)
const randomTo4 = random.bind(null, 0, 4);

// Створює ігрове поле
const createField = (m, n, arr = []) => {
  for (let i = 0; i < m; i++) {
    arr.push(new Array(n).fill(0));
  }
  return arr;
};

// перевіряє, чи не настав кінець гри
// (чи накладається новостворена фігура на вже існуючу)
const checkEndGame = instance => {
  const { x: checkX, y: checkY, blocks: checkBlocks } = instance.activePiece;
  hideLoops(instance, checkBlocks, 1, (instance, y, x) => {
    const yCoor = checkY + y;
    const xCoor = checkX + x * 2;
    if (checkBlocks[y][x] === 1 && instance.playfield[yCoor][xCoor] === 1) {
      console.clear();
      console.log('\x1b[31m \x1b[18;29H 🦍 GAME OVER 🦍');
      console.log(`\x1b[33m \x1b[20;32H SCORE => ${instance.score} \x1b[0m`);
      console.log('\x1b[28;30H');
      process.exit(0);
    }
  });
};

// виводить усі фігури в консолі, окрім падаючої
const showPassivePieces = (instance, y, x) => {
  const yCoor = y + 3;
  const xCoor = x + 24;
  const color = instance.passiveFigCol['' + y + x];
  if (instance.playfield[y][x] === 1) {
    console.log(`\x1b[${yCoor};${xCoor}H` + color);
  } else {
    console.log(`\x1b[${yCoor};${xCoor}H  `);
  }
};

// Виводить у консоль падаючу фігуру і стирає її попереднє розташування
const showPiece = instance => {
  const { yDel, xDel } = instance.activePieceNeedClear;
  const { blocksDel } = instance.activePieceNeedClear;
  const { y: yActive, x: xActive, blocks } = instance.activePiece;
  hideLoops(instance, blocksDel, 1, (instance, y, x) => {
    const yCoor = yDel + y;
    const xCoor = xDel + 2 * x;
    // Стирає попереднє розташування
    if (blocksDel[y][x] === 1 && (instance.playfield[yCoor][xCoor] === 0)) {
      console.log(`\x1b[${yCoor + 3};${xCoor + 24}H  `);
    }
  });
  instance.activePieceNeedClear.xDel = xActive;
  instance.activePieceNeedClear.yDel = yActive;
  instance.activePieceNeedClear.blocksDel = blocks;
  hideLoops(instance, blocks, 1, (instance, y, x) => {
    const yCoor = 3 + yActive + y;
    const xCoor = 24 + xActive + 2 * x;
    if (blocks[y][x] === 1) {  // виводить падаючу фігуру
      console.log(`\x1b[${yCoor};${xCoor}H` + instance.activeShapeFigure);
    }
  });
};

const eventEm = new EventEmitter();

eventEm.on('levelUp', (instance, func) => {
  if (instance.level.speed > 150) {
    instance.level.speed -= 50;
    instance.level.level += 1;
    clearInterval(instance.level.speedometer);
    func();
    instance.level.speedometer = setInterval(func, instance.level.speed);
    console.log(`\x1b[14;56H ${instance.level.level}`);
  }
});

eventEm.on('levelDown', (instance, func) => {
  if (instance.level.speed < 500) {
    instance.level.speed += 50;
    instance.level.level -= 1;
    clearInterval(instance.level.speedometer);
    func();
    instance.level.speedometer = setInterval(func, instance.level.speed);
    console.log(`\x1b[14;56H ${instance.level.level}`);
  }
});

// Клас, який відповідає за рухи фігури
class MovementsPiece {

  constructor() {

    this.score = 0;

    this.playfield = createField(20, 20);

    this.level = {
      speed: 500,
      speedometer: null,
      level: 1,
    };

    this.pause = false;

    this.activeShapeFigure = shapeFigures[randomTo4()];

    this.activePiece = {
      x: 6,
      y: 0,
      blocks: typeFigures[randomTo4()],
    };

    this.passiveFigCol = {};

    this.activePieceNeedClear = {
      xDel: this.activePiece.x,
      yDel: this.activePiece.y,
      blocksDel: this.activePiece.blocks,
    };

    this.nextPiece = {
      nextBlocks: typeFigures[randomTo4()],
      nextShape: shapeFigures[randomTo4()],
    };
  }
  // Перевіряє, чи находиться фігура в ігровому полі
  // і не накладається на інші
  checkErrors() {
    const playfield = this.playfield;
    const { x, y, blocks } = this.activePiece;
    return (hideLoops(this, blocks, 1, (instance, Y, X) =>
      blocks[Y][X] &&
      ((!playfield[y + Y] || playfield[y + Y][x + 2 * X] === undefined) ||
      playfield[y + Y][x + 2 * X])
    ));
  }

  // Рух фігури вниз
  movePieceDown() {
    this.activePiece.y += 1;
    if (this.checkErrors()) {
      this.activePiece.y -= 1;
      this.closePieceInField();
    }
  }

  movePieceRight() {  // Рух фігури вправо
    this.activePiece.x += 2;
    if (this.checkErrors()) {
      this.activePiece.x -= 2;
    }
  }

  movePieceLeft() {  // Рух фігури вліво
    this.activePiece.x -= 2;
    if (this.checkErrors()) {
      this.activePiece.x += 2;
    }
  }

  turnPiece() {  // Поворот фігури на 90 градусів
    const blocks = this.activePiece.blocks;
    if (blocks === typeFigures[1]) return blocks;
    const newBlocks = [];
    hideLoops(this, blocks, 1, (instance, y, x) => {
      if (x === 0) newBlocks.push([]);
      newBlocks[y].push(blocks[blocks.length - 1 - x][y]);
    });
    this.activePiece.blocks = newBlocks;
    if (this.checkErrors()) {
      this.activePiece.blocks = blocks;
    }
  }

  // Видалення заповненого рядка
  deleteLine() {
    const color = this.passiveFigCol;
    for (let count = this.playfield.length - 1; count >= 0; count--) {
      if (this.playfield[count].indexOf(0) === -1) {
        for (let point = count; point >= 0; point--) {
          for (let xNum = 0; xNum < this.playfield[count].length; xNum += 2) {
            const keyThisFig = '' + (point) + xNum;
            const keyUpFig = '' + (point - 1) + xNum;
            // Змінює колір куба на колір куба над ним
            if (color[keyUpFig]) {
              this.passiveFigCol[keyThisFig] = this.passiveFigCol[keyUpFig];
            }
          }
          //  Змінює рядок на рядок над ним (нулі та одинииці)
          this.playfield[point] = this.playfield[point - 1] ?
            this.playfield[point - 1] :
            new Array(this.playfield[point].length).fill(0);
        }
        this.score += 1;
        hideLoops(this, this.playfield, 2, showPassivePieces);
        count++;
        console.log('\x1b[12;63H' + this.score);
      }
    }
  }

  // Фіксує фігуру у полі, коли вона зайняла кінцеву позицію
  closePieceInField() {
    const { x: xActive, y: yActive, blocks } = this.activePiece;
    hideLoops(this, blocks, 1, (instance, y, x) => {
      if (blocks[y][x] === 1) {
        const keyCol = '' + (yActive + y) + (xActive + 2 * x);
        instance.playfield[yActive + y][xActive + 2 * x] = blocks[y][x];
        instance.playfield[yActive + y][xActive + 2 * x + 1] = blocks[y][x];
        instance.passiveFigCol[keyCol] = instance.activeShapeFigure;
      }
    });
    this.activeShapeFigure = this.nextPiece.nextShape;
    this.activePiece.blocks = this.nextPiece.nextBlocks;
    this.nextPiece.nextShape = shapeFigures[randomTo4()];
    this.nextPiece.nextBlocks = typeFigures[randomTo4()];
    this.showNextPiece();
    this.activePiece.y = 0;
    this.activePiece.x = 6;
    checkEndGame(this);
  }

  // Виводить наступну фігуру в окремому полі
  showNextPiece() {
    const { nextBlocks, nextShape } = this.nextPiece;
    hideLoops(this, typeFigures[4], 1, (instance, y, x) => {
      const yCoor = y + 5;
      const xCoor = 2 * x + 52;
      if (nextBlocks[y] && nextBlocks[y][x] === 1) {
        console.log(`\x1b[${yCoor};${xCoor}H` + nextShape);
      } else {
        console.log(`\x1b[${yCoor};${xCoor}H  `);
      }
    });
  }
}



const tetra = new MovementsPiece();

// Виводить в консоль ігрове поле
const showField = () => {
  let field = '\x1b[2;23H======================';
  for (let count = 3; count < 23; count++) {
    field += `\n \x1b[${count};21H ||                    ||`;
  }
  field += '\n \x1b[23;23H======================';
  console.log(field);
};

// Виводить поле для наступної фігури
const showFieldForNextFigure = () => {
  console.log(` 
\x1b[3;50H NEXT FIGURE
\x1b[4;50H ========== 
\x1b[5;50H||        ||
\x1b[6;50H||        ||
\x1b[7;50H||        ||
\x1b[8;50H||        ||
\x1b[9;50H ========== 
`);

};

// Запускає деякі попередні функції/методи, які повинні відбуватися регулярно
const runGame = (reason = 'standart') => {
  showPiece(tetra);
  tetra.deleteLine();
  if (reason === 'standart') {
    tetra.movePieceDown();
  } else if (reason === 'moveRight') {
    tetra.movePieceRight();
  } else if (reason === 'moveLeft') {
    tetra.movePieceLeft();
  } else if (reason === 'turnPiece') {
    tetra.turnPiece();
  }
  console.log('\x1b[25;10H');
};

const runConsoleLogs = instance => {
  console.clear();
  showField();
  showFieldForNextFigure();
  instance.showNextPiece();
  console.log('\x1b[32m\x1b[12;49H 🦍 SCORE 🦍  ' + instance.score);
  console.log('\x1b[14;49H LEVEL  ' + instance.level.level);
  console.log('\x1b[16;49H Arrows - Move figure');
  console.log('\x1b[18;49H SPACE - Turn figure ');
  console.log('\x1b[20;49H Escape - Pause (+|-) ');
  console.log('\x1b[22;49H Shift + Up = Level+ ');
  console.log('\x1b[24;49H Shift + Down = Level- \x1b[0m');
  instance.level.speedometer = setInterval(runGame, instance.level.speed);
};

const codeKeys = {
  'CTRL + C': '\u0003',
  'Space': '\u0020',
  'Left': '\u001b\u005b\u0044',
  'Right': '\u001b\u005b\u0043',
  'Down': '\u001b\u005b\u0042',
  'Shift + Up': '\u001b\u005b\u0031\u003b\u0032\u0041',
  'Shift + Down': '\u001b\u005b\u0031\u003b\u0032\u0042',
  'Escape': '\u001b',
};

// Відповідає за взаємодію користувача з клавіатурою
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => {
  if (c === codeKeys['CTRL + C']) {
    console.log('\x1b[31m \x1b[25;26H 🦍 GAME OVER 🦍 \x1b[0m');
    console.log(`\x1b[33m \x1b[27;29H SCORE => ${tetra.score} \x1b[0m`);
    console.log('\x1b[28;30H');
    process.exit();
  }
  if (c === codeKeys['Space'] && (!tetra.pause)) {
    runGame('turnPiece');
  }
  if (c === codeKeys['Left'] && (!tetra.pause)) {
    runGame('moveLeft');
  }
  if (c === codeKeys['Right'] && (!tetra.pause)) {
    runGame('moveRight');
  }
  if (c === codeKeys['Down'] && (!tetra.pause)) {
    runGame();
  }
  if (c === codeKeys['Shift + Up'] && (!tetra.pause)) {
    eventEm.emit('levelUp', tetra, runGame);
  }
  if (c === codeKeys['Shift + Down'] && (!tetra.pause)) {
    eventEm.emit('levelDown', tetra, runGame);
  }
  if (c === codeKeys['Escape']) {
    if (tetra.pause) {
      tetra.level.speedometer = setInterval(runGame, tetra.level.speed);
      tetra.pause = false;
    } else {
      clearInterval(tetra.level.speedometer);
      tetra.pause = true;
    }
  }
});

runConsoleLogs(tetra);
