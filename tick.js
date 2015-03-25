/* tick.js
 *
 * Code for Tick Fortress 2.
 */

var Solver;

var TickFortress = Backbone.View.extend({
  Achievements: {},
  Unlocked: {},
  Wins: 0,
  Losses: 0,
  pics: {
    'c': 'img/c-chief.png',
    'p': 'img/p-smiley.png',
    'destroy': 'img/destroy.gif',
    'burning': 'img/burning.gif',
    'bait': 'img/bait.jpg',
    'camp': 'img/camp.jpg',
    '': ''
  },

  achieve: function(text) {
    if (!this.Achievements[text]) {
      var tpl = _.template($('#achievement').html());
      $('#achievements').append(tpl({achievement: text}));
      $('#achievements').show();
      this.Achievements[text] = true;
      ohSnap("Achievement Unlocked: " + text, 'achieve');
    }
  },
  
  initialize: function() {
    this.achieve("Opening this page");
    this.pickClass(undefined, this.$el.find('#class-nobody'));
  },
  events: {
    'click .classpicker': 'pickClass',
    'click .square': 'pickSquare',
  },
  moveDescriptions: {
    p: 'Your turn, pick a square',
    destroy: 'Pick a tile to destroy!',
    burn: 'Pick a tile to burn!',
    autoendburn: 'The flames die down ...',
    bait: 'Place a medic kit',
    swapa: 'Pick a chief to shove',
    swapb: 'Pick the tile to shove him to',
    jumpa: 'Pick your soldier to rocket-launch',
    jumpb: 'Pick where he lands',
    autoswapteam: "You're a real Benedict Arnold. Traitors, traitors everywhere",
    autoturret: "Target acquired. BLAM BLAM BLAM BLAM. Target dead.",
    camp: 'Spawn camp a non-central location.',
    c: [
      'Chief is pretty confident about this move!',
      'Chief looks panicked!',
      'Chief desperately looks for a good play.',
      'Chief is thinking hard ...',
      'Chief is thinking a bit ...',
      'Chief is thinking ...',
      'Chief is thinking about something else ...',
      'Chief is planning ...'
    ],
  },
  pickClass: function(evt, el) {
    if (!el) {
      el = $(evt.currentTarget);
    }
    if (el.hasClass('locked')) {
      this.achieve('Lockpicking ... failed.');
      return;
    }
    this.$el.find('.selected').removeClass('selected');
    el.addClass('selected');
    this.startingMoves = el.data('moves').split(/\s+/);
    this.firstMoves = undefined;
    var firstMoves = el.data('first');
    if (firstMoves && firstMoves != '') {
      this.firstMoves = firstMoves.split(/\s+/);
    }
    this.name = el.text();
    this.skill = el.data('skill');
    this.$el.find('#class').text(this.name);
    this.$el.find('#skill').text(this.skill);
    this.playerPic = el.data('pic');
    this.pics.p = this.playerPic;
    $('#player-pic').attr('src', this.playerPic);
    this.$el.find('#skill').text(this.skill);
    this.prepGame();
  },
  
  prepGame: function() {
    if (this.cputimer) {
      clearTimeout(this.cputimer);
      this.cputimer = undefined;
    }
    this.vars = {};
    this.board = [
       '','','',
       '','','',
       '','',''];
    this.renderBoard();
    this.achieve("First game started!");

    // Half the time, enemy goes first.
    if (Math.floor((Math.random() * 2)) == 1) {
      this.moves = [].concat(this.startingMoves);
    } else {
      this.moves = ['c'].concat(this.startingMoves);
    }

    // But if we have firstMoves, those go before
    // anything else.
    if (this.firstMoves) {
      this.moves = this.firstMoves.concat(this.moves);
    }

    this.nextMove();
  },

  nextMove: function() {
    if (this.moves.length < 1) {
      this.moves = ['p','c'];
    }
    this.move = this.moves.shift();

    // Cosmetic: Show your turn indicator.
    var desc = this.moveDescriptions[this.move];
    if (desc) {
      if (typeof(desc) != "string") {
        desc = desc[Math.floor((Math.random() * desc.length))];
      }
      this.$el.find('#turn-indicator').text(desc).show();
    }

    // autoplay? We autoplay in two instances:
    // 1) c, computer.
    // 2) auto*.
    if (this.move == 'c') {
      // In the words of Scalzi: "Nobody likes a computer that thinks faster
      // than they do, so the agents have a delay built in to make them appear
      // more human."
      var me = this; // Oh, ECMA6, where are you ...
      this.cputimer = setTimeout(function() {
        me.cputimer = undefined;
        me.moveAI();
      }, 2000);
    } else if (this.move.match(/^auto/)) {
      // Automatic play.
      if (this[this.move]) {
        this[this.move]();
      }
      var me = this; // Oh, ECMA6, where are you ...
      this.cputimer = setTimeout(function() {
        me.cputimer = undefined;
        me.clearAutos();
        me.renderBoard();
        me.moveComplete();
      }, 2000);
    }
  },
  moveComplete: function() {
    this.renderBoard();
    // Check for a win.
    var winner = Solver.checkWin(this.board);
    if (winner) {
      this.gameOver(winner);
      return;
    }
    // Check for stalemate.
    if (Solver.checkMate(this.board)) {
      this.gameOver();
      return;
    }
    this.nextMove();
  },
  gameOver: function(winner) {
    if (winner == 'p') {
      ohSnap("Congratulations, you won!", 'green');
      this.achieve("Don't let it go to your head.");
      this.$el.find('#turn-indicator').text("You Won!");
    } else if (winner == 'c') {
      ohSnap("How could you let Master Chief win?!", 'red');
      this.achieve("Why do we fall? So we can learn to pick ourselves up.");
      this.$el.find('#turn-indicator').text("You Lost!");
    } else {
      ohSnap("Stalemate", 'red');
      this.achieve("Sometimes the only way to win ... is not to play.");
      this.$el.find('#turn-indicator').text("Stalemate");
    }
    this.unlockNextClass();
    this.move = 'completed';
    this.moves = ['completed'];

    if (this.cputimer) {
      clearTimeout(this.cputimer);
    }
    var me = this;
    this.cputimer = setTimeout(function() {
      me.cputimer = undefined;
      me.prepGame();
    }, 8000);
  },
  unlockNextClass: function() {
    var next = this.$el.find('.locked').first();
    if (next && next.length > 0) {
      next.removeClass('locked');
      this.achieve("Unlocked " + next.text());
    }
  },
  moveAI: function() {
    var logic = this.$el.find('input:checked').data('logic');
    this[logic]();

    this.moveComplete();
  },
  aiNewbie: function() {
    var orig = this.board;

    // For the engineer: If there's any bait, then swap the first bait and return.
    for (var i = 0; i < 9; i++) {
      if (orig[i] == 'bait') {
        this.board[i] = 'c';
        return;
      }
    }
    // Enemy has played.
    this.board[selection] = 'c';
  },
  aiReal: function() {
    // Implementation.
    // For the engineer: If there's any bait, then swap the first bait and return.
    for (var i = 0; i < 9; i++) {
      if (this.board[i] == 'bait') {
        this.board[i] = 'c';
        return;
      }
    }

    // Going first: If all are empty, I just pick center.
    for (var i = 0; i < 9 && this.board[i] == ''; i++);
    if (i == 9) {
      this.board[4] = 'c';
      return;
    }

    // Try and get the best.
    var ideal = Solver.idealMove(this.board);
    this.board[ideal] = 'c';
  },
  pickSquare: function(evt) {
    var bid = $(evt.currentTarget).data('bid');
    if (typeof(bid) != 'number' || bid < 0 || bid > 8) {
      return; // invalid?
    }

    var move = 'pick_'+this.move;
    if (this[move]) {
      this[move](bid);
    }
  },
  pick_c: function(bid) {
    this.achieve("Turn stealer");
  },
  pick_p: function(bid) {
    if (this.board[bid] != '' && this.board[bid] != 'camp') {
      ohSnap("You can't play there", 'red');
      this.achieve("First invalid move!");
    } else {
      this.achieve("First valid move!");
      this.board[bid] = 'p';
      this.moveComplete();
    }
  },
  pick_destroy: function(bid) {
    if (this.board[bid] == '') {
      this.achieve("Demolition Misfire...");
    } else if (this.board[bid] == 'p') {
      this.achieve("Failed to get away in time...");
    } else {
      this.achieve("*KABOOM*");
    }
    this.board[bid] = 'destroy';
    this.renderBoard();
    var me = this;
    this.move = 'wait';
    this.cputimer = setTimeout(function() {
      me.cputimer = undefined;
      me.board[bid] = '';
      me.renderBoard();
      me.moveComplete();
    }, 2000);
  },
  pick_bait: function(bid) {
    if (this.board[bid] == '') {
      this.achieve("EMT Distraction!");
    } else if (this.board[bid] == 'burning') {
      this.achieve("Medical Overdose.");
    }
    this.board[bid] = 'bait';
    this.renderBoard();
    var me = this;
    this.moveComplete();
  },
  pick_burn: function(bid) {
    if (this.board[bid] == '') {
      this.achieve("I love the smell of napalm in the morning.");
    } else if (this.board[bid] == 'burning') {
      this.achieve("Dedicated arsonist.");
    }
    this.board[bid] = 'burning';
    this.renderBoard();
    var me = this;
    this.moveComplete();
  },
  pick_swapa: function(bid) {
    if (this.board[bid] != 'c') {
      ohSnap("You can only shove a Master Chief.", 'red');
    } else {
      this.vars.swapFrom = bid;
      this.$el.find('#board' + bid).addClass('blink')
      this.moveComplete();
    }
  },
  pick_swapb: function(bid) {
    if (this.board[bid] != '') {
      ohSnap("You can't shove a Chief into someone else.", 'red');
    } else {
      this.board[bid] = 'c';
      this.board[this.vars.swapFrom] = '';
      this.achieve("Shovetastic.");
      this.$el.find('.blink').removeClass('blink');
      this.renderBoard();
      this.moveComplete();
    }
  },
  pick_jumpa: function(bid) {
    if (this.board[bid] != 'p') {
      ohSnap("You can only have your pieces jump.", 'red');
    } else {
      this.vars.jumpFrom = bid;
      this.$el.find('#board' + bid).addClass('blink')
      this.moveComplete();
    }
  },
  pick_jumpb: function(bid) {
    if (this.board[bid] != '') {
      ohSnap("You can only jump into an empty square.", 'red');
    } else {
      this.board[bid] = 'p';
      this.board[this.vars.jumpFrom] = '';
      this.achieve("Shovetastic.");
      this.$el.find('.blink').removeClass('blink');
      this.renderBoard();
      this.moveComplete();
    }
  },
  clearAutos: function() {
    this.$el.find('.blink').removeClass('blink');
  },
  autoswapteam: function() {
    for (var i = 0; i < 9; i++) {
      if (this.board[i] == 'p') {
        this.board[i] = 'c';
      } else if (this.board[i] == 'c') {
        this.board[i] = 'p';
      } 
    }
    this.$el.find('.square img').addClass('blink');
    this.achieve("Traitors identified on both teams!");
  },
  autoendburn: function() {
    for (var i = 0; i < 9; i++) {
      if (this.board[i] == 'burning') {
        this.board[i] = '';
      }
    }
    this.renderBoard();
  },
  autoturret: function() {
    this.achieve("Target acquired. Blam blam blam blam.");
    var chiefs = [];
    for (var i = 0; i < 9; i++) {
      if (this.board[i] == 'c') {
        chiefs.push(i);
      }
    }
    var selection = chiefs[Math.floor((Math.random() * chiefs.length))];
    this.$el.find('#board' + selection).addClass('blink')
    this.board[selection] = '';
  },
  pick_wait: function(bid) {
    this.achieve('So impatient!');
  },
  pick_completed: function(bid) {
      this.achieve("Attempted to play after game over!");
  },
  pick_camp: function(bid) {
    if (bid == 4) {
      this.achieve("CAAAAAAMPERRRRR!");
      ohSnap("You can't camp the center!", "red");
    } else if (this.vars.camp == bid) {
      this.achieve("Double the camping, double the fun!");
      this.moveComplete();
    } else if (this.vars.camp) {
      var a = this.vars.camp;
      var x;
      if (a > bid) {
        x = '' + bid + '' + a;
      } else {
        x = '' + a + '' + bid;
      }
      //  0 1 2
      //  3 4 5
      //  6 7 8
      var sees = [
        "01", "02", "03", "06", "08",
        "12", "17", "25", "28", "35",
        "36", "58", "67", "68", "78"
        ];
      for (var i = 0; i < sees.length; i++) {
        if (sees[i] == x) {
          ohSnap("You can't camp two spots in the same winning line!", "red");
          this.achieve("Can't hold the line.");
          return;
        }
      }
      this.board[bid] = 'camp';
      this.moveComplete();
    } else {
      this.vars.camp = bid;
      this.board[bid] = 'camp';
      this.moveComplete();
    }
  },
  renderBoard: function() {
    for (var i = 0; i < 9; i++) {
      this.$el.find('#board' + i).attr('src', this.pics[this.board[i]]);
    }
  },
});

Solver = {
  checkWin: function(b) {
    // Horizontal.
    if (b[0] != '' && b[0] == b[1] && b[0] == b[2]) return b[0];
    if (b[3] != '' && b[3] == b[4] && b[3] == b[5]) return b[3];
    if (b[6] != '' && b[6] == b[7] && b[6] == b[8]) return b[6];
    // Vertical
    if (b[0] != '' && b[0] == b[3] && b[0] == b[6]) return b[0];
    if (b[1] != '' && b[1] == b[4] && b[1] == b[7]) return b[1];
    if (b[2] != '' && b[2] == b[5] && b[2] == b[8]) return b[2];
    // Diagonals
    if (b[0] != '' && b[0] == b[4] && b[0] == b[8]) return b[0];
    if (b[2] != '' && b[2] == b[4] && b[2] == b[6]) return b[2];
    // No win
    return false;
  },
  checkMate: function(b) {
    if (b[0] != '' && b[1] != '' && b[2] != '' &&
        b[3] != '' && b[4] != '' && b[5] != '' &&
        b[6] != '' && b[7] != '' && b[8] != '') {
      return true;
    }
  },
  idealMove: function(orig) {
    // Strategy:
    // *) If two 'c's in a line with a third in same line empty ... take it.
    // *) If two 'p's in a line with a third in same line empty ... take it (block)
    // *) Take center if it exists.
    // *) Watch out for major fork: XOX (pcp) with p in corners. If so, pick
    //    a non-corner tile in an empty row.
    // *) Take a corner, preferring a corner not opposite a 'p'
    // *) Take a space that may make a line with a 'c'
    // *) Take any space.
  
    // Store original board
    // Implementation.

    //
    // If two 'c's in a line with a third in same line empty ... take it.  I'm
    // lazy now, so I'm gonna cheat and brute force it.
    for (var i = 0; i < 9; i++) {
      if (orig[i] == '') {
        var board = [].concat(orig);
        board[i] = 'c';
        if (this.checkWin(board) == 'c') {
          return i;
        }
      }
    }

    // If two 'p's in a line with a third in same line empty ... take it (block)
    // Same laziness as earlier logic. If I compare against non-'c's, then AI treats,
    // e.g: burning fires from Pyro as player, which it shouldn't, being a dumb
    // AI against "skills".
    for (var i = 0; i < 9; i++) {
      if (orig[i] == '') {
        var board = [].concat(orig);
        board[i] = 'p';
        if (this.checkWin(board) == 'p') {
          return i;
        }
      }
    }
    
    // Take center if it's empty.
    if (orig[4] == '') {
      return 4;
    }

    // Check for XOX (pcp) on diagonals for an unbeatable fork.
    if (orig[4] == 'c') {
      if ((orig[0] == 'p' && orig[8] == 'p') ||
          (orig[2] == 'p' && orig[6] == 'p')) {
        if (orig[1] == '' && orig[7] == '') {
          return 1;
        } else if (orig[3] == '' && orig[5] == '') {
          return 3;
        }
      }
    }

    // Take a corner, preferring a corner near a 'p'
    if (orig[8] != 'p' && orig[0] == '') { return 0; }
    if (orig[6] != 'p' && orig[2] == '') { return 2; }
    if (orig[2] != 'p' && orig[6] == '') { return 6; }
    if (orig[0] != 'p' && orig[8] == '') { return 8; }

    if (orig[0] == '') { return 0; }
    if (orig[2] == '') { return 2; }
    if (orig[6] == '') { return 6; }
    if (orig[8] == '') { return 8; }

    // Pick randomly.
    return this.randomMove(orig);
  },
  randomMove: function(orig) {
    var empties = [];
    for (var i = 0; i < 9; i++) {
      if (orig[i] == '') {
        empties.push(i);
      }
    }

    return empties[Math.floor((Math.random() * empties.length))];
  }
};

var Game;
// Initial defaults on page load.
$(function() {
  Game = new TickFortress({el: $('body')});
});
