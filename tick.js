/* tick.js
 *
 * Code for Tick Fortress 2.
 */

var TickFortress = Backbone.View.extend({
  Achievements: {},
  Unlocked: {},
  Wins: 0,
  Losses: 0,

  achieve: function(text) {
    if (!this.Achievements[text]) {
      var tpl = _.template($('#achievement').html());
      $('#achievements').append(tpl({achievement: text}));
      $('#achievements').show();
      this.Achievements[text] = true;
      ohSnap("Achievement Unlocked: " + text, 'green');
    }
  },
  
  initialize: function() {
    this.achieve("Opening this page");
    this.pickClass(undefined, this.$el.find('#class-nobody'));
  },
  events: {
    'click .classpicker.unlocked': 'pickClass',
    'click #game-start': 'startGame',
  },
  moveDescriptions: {
    p: 'Your turn, pick a square',
    destroy: 'Pick a tile to destroy!',
    burn: 'Pick a tile to burn!',
    c: [
      'Administrator is pretty confident about this move!',
      'Administrator looks panicked!',
      'Administrator desperately looks for a good play.',
      'Administrator is thinking hard ...',
      'Administrator is thinking a bit ...',
      'Administrator is thinking ...',
      'Administrator is thinking about something else ...',
      'Administrator is planning ...'
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

    this.prepGame();
  },
  
  prepGame: function() {
    this.$el.find('#turn-indicator').hide();
    this.$el.find('#turn-start').show();
  },

  startGame: function() {
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
    if (this.moves == []) {
      this.moves = [].concat(this.defaultMoves);
    }
    this.move = this.moves.shift();

    // Cosmetic: Show your turn indicator.
    var desc = this.moveDescriptions[this.move];
    if (!desc) {
      console.log("Unable to find move desc for '" + this.move + "' ?!");
    }
    if (typeof(desc) != "string") {
      desc = desc[Math.floor((Math.random() * desc.length))]
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
  moveAI: function() {
    console.log("Time to move computer ...");
  },
});


var Game;

// Initial defaults on page load.
$(function() {
  Game = new TickFortress({el: $('body')});
});
