/* tick.js
 *
 * Code for Tick Fortress 2.
 */

var TickFortress = Backbone.View.extend({
  Achievements: {},
  Unlocked: {},
  Wins: 0,
  Losses: 0,
  pics: {
    'c': 'img/c-chief.png',
    'p': 'img/p-smiley.png',
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
    'click .classpicker.unlocked': 'pickClass',
    'click #game-start': 'startGame',
    'click .square': 'pickSquare',
  },
  moveDescriptions: {
    p: 'Your turn, pick a square',
    destroy: 'Pick a tile to destroy!',
    burn: 'Pick a tile to burn!',
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
    this.defaultMoves = el.data('moves').split(/\s+/);
    this.name = el.text();
    this.skill = el.data('skill');
    this.$el.find('#class').text(this.name);
    this.$el.find('#skill').text(this.skill);
    this.playerPic = el.data('pic');
    this.pics.p = this.playerPic;
    $('#player-pic').attr('src', this.playerPic);
    this.$el.find('#skill').text(this.skill);
    if (this.name != 'Unclassed') {
      this.achieve("First class picked!");
    }
    this.prepGame();
  },
  
  prepGame: function() {
    this.$el.find('#turn-indicator').hide();
    this.$el.find('#turn-start').show();
    this.board = [
       '','','',
       '','','',
       '','',''];
    this.renderBoard();
  },

  startGame: function() {
    this.achieve("First game started!");
    this.$el.find('#turn-start').hide();
    // Half the time, enemy goes first.
    if (Math.floor((Math.random() * 2)) == 1) {
      this.moves = [].concat(this.defaultMoves);
    } else {
      this.moves = ['c'].concat(this.defaultMoves);
    }
    this.nextMove();
  },

  nextMove: function() {
    console.log("Moves:");
    console.log(this.moves);
    console.log("defaultMoves:");
    console.log(this.defaultMoves);
    if (this.moves.length < 1) {
      this.moves = [].concat(this.defaultMoves);
    }
    this.move = this.moves.shift();

    // Cosmetic: Show your turn indicator.
    var desc = this.moveDescriptions[this.move];
    if (!desc) {
      console.log("Unable to find move desc for '" + this.move + "' ?!");
    }
    if (typeof(desc) != "string") {
      desc = desc[Math.floor((Math.random() * desc.length))];
    }
    this.$el.find('#turn-indicator').text(desc).show();

    // Computer's turn?
    if (this.move == 'c') {
      // In the words of Scalzi: "Nobody likes a computer that thinks faster
      // than they do, so the agents have a delay built in to make them appear
      // more human."
      var me = this; // Oh, ECMA6, where are you ...
      this.cputimer = setTimeout(function() { me.moveAI(); }, 2000);
    }
  },
  moveComplete: function() {
    this.renderBoard();
    // Check for a win.
    var winner = this.checkWin();
    if (winner) {
      this.gameOver(winner);
      return;
    }
    // Check for stalemate.
    if (this.checkEmpty()) {
      this.gameOver();
    }
    this.nextMove();
  },
  checkWin: function() {
    // Horizontal.
    var b = this.board;
    if (b[0] != '' && b[0] == b[1] && b[0] == b[2]) return b[0];
    if (b[3] != '' && b[3] == b[4] && b[3] == b[5]) return b[3];
    if (b[6] != '' && b[6] == b[7] && b[6] == b[8]) return b[6];
    // Vertical
    if (b[0] != '' && b[0] == b[3] && b[0] == b[6]) return b[0];
    if (b[1] != '' && b[1] == b[4] && b[1] == b[7]) return b[1];
    if (b[2] != '' && b[2] == b[5] && b[2] == b[8]) return b[2];
    // Diagonals
    if (b[0] != '' && b[0] == b[4] && b[0] == b[8]) return b[1];
    if (b[2] != '' && b[2] == b[4] && b[2] == b[6]) return b[2];
    // No win
    return false;
  },
  checkEmpty: function() {
    var b = this.board;
    if (b[0] != '' && b[1] != '' && b[2] != '' &&
        b[3] != '' && b[4] != '' && b[5] != '' &&
        b[6] != '' && b[7] != '' && b[8] != '') {
      return true;
    }
  },
  gameOver: function(winner) {
    if (winner == 'p') {
      ohSnap("Congratulations, you won!", 'green');
      this.achieve("First win!");
    } else if (winner == 'c') {
      ohSnap("How could you let Master Chief win?!", 'red');
      this.achieve("First loss!");
    } else {
      ohSnap("How could you let Master Chief win?!", 'red');
      this.achieve("First stalemate!");
    }
    this.unlockNextClass();
    this.move = 'completed';
  },
  moveAI: function() {
    var logic = this.$el.find('input:checked').data('logic');
    this[logic]();
  },
  aiNewbie: function() {
    var empties = [];
    for (var i = 0; i < 9; i++) {
      if (this.board[i] == '') {
        empties.push(i);
      }
    }

    var selection = empties[Math.floor((Math.random() * empties.length))];
    // Enemy has played.
    this.board[selection] = 'c';

    this.moveComplete();
  },
  aiReal: function() {
    // TODO: Code the AI.
    this.aiNewbie();
  },
  pickSquare: function(evt) {
    var bid = $(evt.currentTarget).data('bid');
    if (typeof(bid) != 'number' || bid < 0 || bid > 8) {
      return; // invalid?
    }

    var move = 'pick_'+this.move;
    if (this[move]) {
      this[move](bid);
    } else {
      console.log("Not your turn. Move: '" + this.move + "'");
    }
  },
  pick_p: function(bid) {
    if (this.board[bid] != '') {
      ohSnap("You can't play there", 'red');
      this.achieve("First invalid move!");
    } else {
      this.achieve("First valid move!");
      this.board[bid] = 'p';
    }
    this.moveComplete();
  },
  pick_completed: function(bid) {
      this.achieve("Attempted to play after game over!");
  },
  renderBoard: function() {
    for (var i = 0; i < 9; i++) {
      this.$el.find('#board' + i).attr('src', this.pics[this.board[i]]);
    }
  },
});


var Game;

// Initial defaults on page load.
$(function() {
  Game = new TickFortress({el: $('body')});
});
