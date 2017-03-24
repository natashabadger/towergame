'use strict'

// wait for the window to load and than call back setup()
window.addEventListener('load', setup, false);

var towerGame;   // the global game object
var count = 0;
var cellId = 0;
var pf;   // the global path finder object
const TWO_PI = 6.28318530718;
const FRAME_RATE=30;

function setup() {
  towerGame = new Game();
  window.setTimeout(draw, 100);    // wait 100ms for resources to load then start draw loop
}

function draw() {   // the animation loop
    towerGame.run();
    window.setTimeout(draw, 1000/FRAME_RATE);  // come back here every interval
}

// Game is the top level object and it contains the levels
class Game {
  //  This is a test
  constructor() { // from setup()
    this.cnv = document.createElement("canvas");
    if(!this.cnv || !this.cnv.getContext)
        throw "No valid canvas found!";
    this.cnv.width = 900;
    this.cnv.height = 750;
    document.getElementById('canDiv').appendChild(this.cnv);
    this.context = this.cnv.getContext("2d");
    if(!this.context)
        throw "No valid context found!";

    this.isRunning = true;
    this.placingTower = false;
    this.currentTower = 0;
    this.towerType = 0;
    this.gameTime = 0;
    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.grid = [];
    this.bankValue = 500;
    this.mouseX = 0;
  this.mouseY = 0;
  this.w = 45;
  this.done = false;

  this.cols = Math.floor(this.cnv.width / this.w);
  this.rows = Math.floor(this.cnv.height / this.w);

//  this.loadGrid();
  this.root = this.grid[this.cols - 1][this.rows -1];
  this.brushfire();

    this.lastTime = Date.now();
    //select everything of type/class and set call backs
    this.tileDivs = this.createTileDivs();
    this.loadDOMCallBacks(this.tileDivs);
    // select canvas for callbacks
    this.cnv.addEventListener('mousemove',this.handleCNVMouseMoved,false);
    this.cnv.addEventListener('mouseover',this.handleCNVMouseOver, false);
    this.cnv.addEventListener('click', this.handleCNVMouseClicked, false);

    this.cnv.addEventListener('mousedown',function(evt){
      pf.mouseX = evt.offsetX;
      pf.mouseY = evt.offsetY;
      let row = Math.floor(pf.mouseY/pf.w);
      let col = Math.floor(pf.mouseX/pf.w);
      // toggle the occupied property of the clicked cell
      pf.grid[col][row].occupied = !pf.grid[col][row].occupied;
      pf.brushfire();   // all new distances and parents
      // delete any enemy that is currently in a cell without a parent
      for(let i = 0; i < pf.enemies.length; i++) {
        let enemy = pf.enemies[i];
        if(!enemy.currentCell.parent)
            enemy.kill = true;    // kill the orphans
  }
}, false);
}
  // The success callback when a tower canvas image
  // or bullet image has loaded.  Hide them from
  // displaying on the page.
  hideImgElement() { this.style.display = "none"; }

  run() { // called from draw()
    this.render();
    let gt = this.updateGameTime();
    this.updateInfoElements(gt);
    this.removeBullets();
    if (this.isRunning) {
      this.render();
    }
    for (let i = 0; i < this.towers.length; i++) {
      this.towers[i].run();
    }
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].run();
    }
    for (let i = 0; i < this.bullets.length; i++) {

      this.bullets[i].run();
    }
    for(let i = this.enemies.length-1; i >= 0; i--) {
    if(this.enemies[i].kill)
        this.enemies.splice(i,1);   // delete this dead enemy
    else this.enemies[i].run();
  }
}

  render() { // draw game stuff
    this.context.clearRect(0,0,this.cnv.width, this.cnv.height);
    for(let i = 0; i < this.cols; i++){
      for(let j = 0; j < this.rows; j++){
        this.grid[i][j].render();
  }
}
}

  brushfire() {
    // Initialize each cell in the grid to have a distance that
    // is the greatest possible.  Initialize each cell to
    // have no parent and populate it's array of neighbors
    for(var i = 0; i < this.cols; i++){
      for(var j = 0; j < this.rows; j++){
        var cell = this.grid[i][j];
        cell.dist = this.cols * this.rows * 10;     // set distance to max
        cell.vec = null;    // clear parent vector
        cell.parent = 0;    // clear parent
        cell.addNeighbors(this,  this.grid); // fill the neighbors array
      }
    }
    // Initialize the fifo queue with the root cell
    this.root.dist = 0;
    this.root.occupied = false;
    var queue = [this.root];

    // loop as long as the queue is not empty, removing the first cell
    // in the queue and adding all its neighbors to the end of the
    // queue.  The neighbors will only be those that are not occupied
    // and not blocked diagonally.
    while(queue.length) {
        var current = queue.shift();   // remove the first cell from the queue
        // for all its neighbors...
        for(let j =0; j < current.neighbors.length; j++){
            let neighbor = current.neighbors[j];
            var dist = current.dist+10; // adjacent neighbors have a distance of 10
            if(current.loc.x != neighbor.loc.x && current.loc.y != neighbor.loc.y)
                dist = current.dist+14; // diagonal neighbors have a distance of 14
            // if this neighbor has not already been assigned a distance
            // or we now have a shorter distance, give it a distance
            // and a parent and push to the end of the queue.
            if(neighbor.dist > dist) {
                neighbor.parent = current;
                neighbor.dist = dist;
                queue.push(neighbor);
                }
          }     // for each neighbor
        }   // while(queue.length)

        // give each cell a vector that points to its parent
      for(var i = 0; i < this.cols; i++){
        for(var j = 0; j < this.rows; j++){
          this.grid[i][j].vec = this.grid[i][j].getVector();
        }
      }

    }

    sendEnemies() {
    var numEnemies = Math.random() * 5;     // up to 5 enemies
    var row, col, startCell, i, j;
    for( i = 0; i < numEnemies; i++) {
        for(j = 0; j < 3; j++) { // try 3 times to find valid start cell
            let row = Math.floor(Math.random() * (pf.rows/2));    // top  half of rows
            let col = Math.floor(Math.random() * pf.cols);        // any column
            startCell = pf.grid[col][row];
            if(startCell && startCell.parent)   // must have a parent to have any path
                break;
            }
        if(j < 3) { // if we found a valid cell to start the enemy
            let randomPath = Math.floor(Math.random() * 2);    // about half
            pf.enemies.push(new Enemy(pf, startCell, randomPath));
            }
        }
}

  removeBullets(){
    if(this.bullets.length < 1) return;
    for(let i = this.bullets.length-1; i >= 0; i--){

       if( this.bullets[i].loc.x < 0 ||
           this.bullets[i].loc.x > this.cnv.width ||
           this.bullets[i].loc.y < 0 ||
           this.bullets[i].loc.y > this.cnv.height ){
             this.bullets.splice(i, 1);
           }

    }
  }
  updateInfoElements(time){
    let infoElements = document.getElementById('infoDiv').getElementsByClassName('infoTileDiv');
    for(let i = 0; i < infoElements.length; i++){
      let info = infoElements[i];
      // change the html content after condition--use indexOf
      if(info.innerHTML.indexOf('Bank') != -1){
        info.innerHTML = 'Bank <br/>' + this.bankValue;
      }else if(info.innerHTML.indexOf('Time') != -1){
        info.innerHTML = 'Time <br/>' + time;
      }
    }
  }

  updateGameTime(){
    var millis = Date.now();
    if(millis - this.lastTime >= 1000) {
      this.gameTime++;
      this.lastTime = millis;
    }
    return this.gameTime;
  }

  // Create the divs to hold the menu of towers with
  // the large images.  This divs also contain the
  // parameters for creating towers to be drawn on the
  // canvas.
  createTileDivs(){
    var tiles = [];

    for(var i = 0; i < 5; i++){
      var mtd = document.createElement("div"); // createDiv("");
      var cnvTurImgPath = "tow" + (i+1) + "s.png";  // small tower image for canvas
      var cnvBulImgPath = "b" + (i+1) + ".png";     // bullet image for canvas
      mtd.cnvTurImg = new Image();
      mtd.cnvTurImg.addEventListener('load',this.hideImgElement,false);
      mtd.cnvTurImg.addEventListener('error', function() { console.log(cnvTurImgPath + " failed to load"); }, false);
      mtd.cnvTurImg.src = cnvTurImgPath;    // start loading image

      mtd.cnvBulImg = new Image();
      mtd.cnvBulImg.addEventListener('load',this.hideImgElement,false);
      mtd.cnvBulImg.addEventListener('error', function() { console.log(cnvBulImgPath + " failed to load"); }, false);
      mtd.cnvBulImg.src = cnvBulImgPath;    // start loading image

      document.getElementById("menuDiv").appendChild(mtd);

      mtd.cost = 100*i +50;
      mtd.id = 'towImgDiv' + i;
      tiles.push(mtd);
      var imgName = 'tow' + i + '.png'; // large image for menu tile
      var tImg = new Image();
      tImg.addEventListener('error', function() { console.log(imgName + " failed to load"); }, false);
      tImg.src = imgName;
      mtd.appendChild(tImg);
    }
    return tiles;
  }

  getBankValue(){
    return this.bankValue;
  }
  //  Logic to add tower +++++++++++++++++++++++
  canAddTower() {
    // add conditions before allowing user to place turret
    if(towerGame.placingTower)
      return true;
    return(false);
  }

  createTower(mtd) { // menu turret div
    // create a new tower object and add to array list
    // the menu tower div contains the parameters for the tower
    var tower = new Tower( mtd.cost, mtd.cnvTurImg, mtd.cnvBulImg);
    if(tower)
      this.towers.push(tower); // add tower to the end of the array of towers
    else {
      println('failed to make tower');
    }
  }

  placeTower() {
    //  place tower into play area at location of mouse
    towerGame.towers[towerGame.towers.length-1].loc = vector2d(this.cnv.mouseX, this.cnv.mouseY);
//    console.log(towerGame.towers[towerGame.towers.length-1].loc.toString());
    //  tower needs to know if it is placed
    towerGame.towers[towerGame.towers.length-1].placed = true;
    //  only one tower placed at a time
    towerGame.placingTower = false;
  }

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ load callbacks
  loadDOMCallBacks(menuTiles) {
    //  load tile menu callbacks
    for (var i = 0; i < menuTiles.length; i++) {
        var mtd = menuTiles[i];
        mtd.addEventListener('mouseover',this.tileRollOver,false);
        mtd.addEventListener('mouseout', this.tileRollOut, false);
        mtd.addEventListener('mousedown', this.tilePressed, false);
        mtd.addEventListener('click', this.tileClicked, false);
    }

  }

  //+++++++++++++++++++++++++   tile menu callbacks
  tileRollOver() {
    this.style.backgroundColor = '#f7e22a';
  }

  tileRollOut() {
    this.style.backgroundColor = '#DDD';
  }

  tilePressed() {
    this.style.backgroundColor = '#900';
  }

  tileClicked() {
    //if user clicks tile and not placing tile change placing to true
    // can add Tower checks cost and other conditions
    if(towerGame.placingTower === true) return;
    if (towerGame.getBankValue() > 100) {
      towerGame.createTower(this);
      towerGame.placingTower = true;
    }

  }
//  ++++++++++++++++++++++++++++++++++++++++++++++++++    mouse handlers
  handleCNVMouseOver() {
    if(towerGame.towers.length < 1) return;
    towerGame.towers[towerGame.towers.length-1].visible = true;
  }

  handleCNVMouseMoved(event) {
    // add some properties to the canvas to track the mouse.
    this.mouseX = event.offsetX;
    this.mouseY = event.offsetY;
    if(towerGame.towers.length < 1) return;
    if(!towerGame.towers[towerGame.towers.length-1].placed &&
      towerGame.placingTower === true ){
        //follow mouse
        towerGame.towers[towerGame.towers.length-1].loc.x = this.mouseX;
        towerGame.towers[towerGame.towers.length-1].loc.y = this.mouseY;
//        console.log(this.mouseX + ", " + this.mouseY + ", " + towerGame.towers[towerGame.towers.length-1].loc.toString());
      }
  }

  handleCNVMouseClicked() {
    if(towerGame.canAddTower()){
      towerGame.placeTower();
    }
  }

  handleButtonMouseOver() {
  this.style.backgroundColor = '#AA3377';
}

handleButtonMouseOut() {
  this.style.backgroundColor = '#AAA';
}
  //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Other
} // end Game class +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
