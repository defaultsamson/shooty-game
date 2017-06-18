var username = "";

var isMainMenu = true;
var isOnlineMenu = false;
var isInHostMenu = false;
var isInGameCreationWait = false;
var isInJoinMenu = false;
var isInLocalGame = false;
var isShowingError = false;

var ws;
const serverIP = "localhost:9060"; // 192.168.1.146

function createGame() {
  isInGameCreationWait = true;
  isInHostMenu = false;

  $("#hostUserInput").blur(); // Unfocuses the text field
  $("#hostForm").stop().animate({
    top: "110%"
  }, {
    duration: 800,
    queue: false
  }).fadeOut(fade);
  $("#pEnterText").stop().animate({
    top: "-30%"
  }, {
    duration: 800,
    queue: false
  }).fadeOut(fade);

  $("#pConnectingText").fadeIn(fade);

  createClient();
}

function createClient() {
  ws = new WebSocket("ws://" + serverIP);

  /*$("#btnsend").on('click', function() {
    var message = $("#message").val();
    ws.send(JSON.stringify({
      type: "ping"
    }));
    console.log('Sending message: \"' + message + '\"');
  });*/

  ws.onmessage = function (message) {
    console.log('Recieving message: \"' + message.data + '\"');

    var json = JSON.parse(message.data);

    if ("type" in json) {
      switch (json.type) {
        case "pong":
          console.log("Pong");
          break;
      }
    } else {
      console.log("Error: No \"type\" field found in json object")
    }
  };

  ws.onclose = function (evt) {
    console.log('Conenction Closed (' + evt.code + ')');
  };

  ws.onerror = function (evt) {
    console.log('Error Occured (' + evt.code + ')');
    resetOnlineGame();
    displayError();
  };
}

function displayError() {
  isShowingError = true;

  $("#pErrorText").fadeIn(fade);
  $("#pEscText").fadeIn(fade);
  $("#pConnectingText").stop().fadeOut(fade);
}

function resetOnlineGame() {

}

function returnToOnlineMenu() {
  isOnlineMenu = true;

  $("#kLeftMenu").finish().fadeIn(fade);
  $("#kRightMenu").finish().fadeIn(fade);
  $("#kDownMenu").finish().fadeIn(fade);
  $("#pJoin").stop().fadeIn(fade);
  $("#pHost").stop().fadeIn(fade);
  $("#pJoinRandom").stop().fadeIn(fade);
  $("#pEnterText").finish().fadeOut(fade);
}

function returnToHostMenu() {
  $("#hostForm").stop().animate({
    top: "40%"
  }, {
    duration: 800,
    queue: false
  }).fadeIn(fade, function () {
    $("#hostUserInput").focus();
  });
  $("#pEnterText").stop().animate({
    top: "18.5%"
  }, {
    duration: 800,
    queue: false
  }).fadeIn(fade);

  $("#pConnectingText").fadeOut(fade);
}

function returnMenu() {
  if (isShowingError) {
    $("#pErrorText").fadeOut(fade);
    isShowingError = false;
    if (isInGameCreationWait) {
      isInGameCreationWait = false;
      isInHostMenu = true;
      returnToHostMenu();
    }
  } else if (isInGameCreationWait) {
    isInGameCreationWait = false;
    isInHostMenu = true;
    returnToHostMenu();
  } else if (isInJoinMenu) {
    isInJoinMenu = false;
    returnToOnlineMenu();
    $("#joinUserInput").blur(); // Unfocuses the text field
    $("#joinKeyInput").blur(); // Unfocuses the text field
    $("#joinForm").stop().fadeOut(fade);
  } else if (isInHostMenu) {
    isInHostMenu = false;
    returnToOnlineMenu();
    $("#hostUserInput").blur(); // Unfocuses the text field
    $("#hostForm").finish().fadeOut(fade);
  } else if (isOnlineMenu) {
    $("#kLeftMenu").animate({
      top: "50%"
    }, 800);
    $("#kRightMenu").animate({
      top: "50%"
    }, 800);
    $("#kDownMenu").stop().animate({
      top: "110%"
    }, 800).fadeOut({
      duration: 400,
      queue: false
    });
    $("#pOffline").stop().fadeIn(fade);
    $("#pMenuMultiplayer").stop().fadeIn(fade);
    $("#pOnline").stop().fadeIn(fade);
    $("#pOnlineDesc").stop().fadeIn(fade);
    $("#pOfflineDesc").stop().fadeIn(fade);
    $("#pJoin").stop().fadeOut(fade);
    $("#pHost").stop().fadeOut(fade);
    $("#pJoinRandom").stop().fadeOut(fade);
    $("#pEscText").stop().fadeOut(fade);

    isOnlineMenu = false;
    isMainMenu = true;
  } else if (isInLocalGame) {
    resetGame();
    mainMenuEntranceAnimation();
    isInLocalGame = false;
    isMainMenu = true;
  }
}

$(document).ready('input').keydown(function (e) {

  if (!preventKeyPress) {
    if (isMainMenu) {
      if (isLeft(e.keyCode)) {
        gotoOnlineGameMenu();
      } else if (isRight(e.keyCode)) {
        gotoLocalGame();
      }
    } else if (isShowingError) {
      if (e.keyCode == esc) {
        returnMenu();
      }
    } else if (isOnlineMenu) {
      if (isLeft(e.keyCode)) {
        gotoJoinMenu();
      } else if (isRight(e.keyCode)) {
        gotoHostMenu();
      } else if (e.keyCode == space) {

      } else if (e.keyCode == esc) {
        returnMenu();
      }
    } else if (isInHostMenu) {
      username = $("#hostUserInput").val();

      if (e.keyCode == space) {

      } else if (e.keyCode == esc) {
        returnMenu();
      } else if (e.keyCode == enter) {
        // If the username input is filled out properly
        if (/^([A-Za-z0-9]{3,20})$/.test(username)) {
          createGame();
          return false;
        }
      }
    } else if (isInJoinMenu) {
      username = $("#joinUserInput").val();

      if (e.keyCode == space) {

      } else if (e.keyCode == esc) {
        returnMenu();
      } else if (e.keyCode == enter) {

        if (e.target.id === "joinKeyInput" && /^([A-Za-z0-9]{6})$/.test($("#joinKeyInput").val())) {
          return false;
        } else if (e.target.id === "joinUserInput" && /^([A-Za-z0-9]{3,20})$/.test(username)) {
          return false;
        }
      }
    } else if (isInGameCreationWait) {
      if (e.keyCode == esc) {
        // TODO returnMenu();
      }
    } else if (isInLocalGame) {
      if (e.keyCode == esc && !inGame) {
        returnMenu();
      } else if (e.keyCode == space && !inGame) {
        resetGame();
        startGame();
      }

      // If the players can shoot
      if (canShoot) {
        // If the key is valid (and isn't space)
        if (e.keyCode != space && e.keyCode != esc && $.inArray(e.keyCode,
            downKeys) == -1) {
          downKeys.push(e.keyCode);
          // gets the name of the key
          var str = String.fromCharCode(e.keyCode);
          // If they shot too early
          if (preShot) {
            addItemToList("lFailList", str);
          } else { // Else, they shot in time
            addItemToList("lWinList", str + ": " + (Date.now() - shootTime) +
              " ms");
            winCount++;
          }
        }
      }
    }
  }
});

var preventKeyPress = false;







function gotoHostMenu() {
  isInHostMenu = true;
  isOnlineMenu = false;

  $("#pEnterText").stop().fadeIn(fade);
  $("#hostForm").fadeIn(fade, function () {
    $("#hostUserInput").focus();
  });
  $("#hostUserInput").val(username);

  $("#kLeftMenu").fadeOut(fade);
  $("#kRightMenu").fadeOut(fade);
  $("#kDownMenu").fadeOut(fade);
  $("#pJoin").stop().fadeOut(fade);
  $("#pHost").stop().fadeOut(fade);
  $("#pJoinRandom").stop().fadeOut(fade);
}

function gotoJoinMenu() {
  isInJoinMenu = true;
  isOnlineMenu = false;

  $("#pEnterText").stop().fadeIn(fade);
  $("#joinForm").fadeIn(fade, function () {
    $("#joinUserInput").focus();
  });
  $("#joinUserInput").val(username);

  $("#kLeftMenu").fadeOut(fade);
  $("#kRightMenu").fadeOut(fade);
  $("#kDownMenu").fadeOut(fade);
  $("#pJoin").stop().fadeOut(fade);
  $("#pHost").stop().fadeOut(fade);
  $("#pJoinRandom").stop().fadeOut(fade);
}

// Lets jquery objects get shoken from side to side
// dir: should be -1 or 1 to specify the direction of the shake
jQuery.fn.shake = function (dir) {
  var pos = $(this).position();
  $(this).animate({
    left: pos.left - (18 * dir)
  }, 10).animate({
    left: pos.left
  }, 50).animate({
    left: pos.left + (11 * dir)
  }, 10).animate({
    left: pos.left
  }, 25);
  return this;
}

var hasFocus = true;

$(window).focus(function () {
  hasFocus = true;
});

$(window).blur(function () {
  hasFocus = false;
});

var createAllErrors = function () {
  var form = $(this),
    errorList = $("ul.errorMessages", form);

  var showAllErrorMessages = function () {
    errorList.empty();

    // Find all invalid fields within the form.
    var invalidFields = form.find(":invalid").each(function (index, node) {

      // Find the field's corresponding label
      var label = $("label[for=" + node.id + "] "),
        // Opera incorrectly does not fill the validationMessage property.
        message = node.validationMessage || 'Invalid value.';

      errorList
        .show()
        .append("<li><span>" + label.html() + "</span> " + message + "</li>");
    });
  };

  // Support Safari
  form.on("submit", function (event) {
    if (this.checkValidity && !this.checkValidity()) {
      $(this).find(":invalid").first().focus();
      event.preventDefault();
    }
  });

  $("input[type=submit], button:not([type=button])", form)
    .on("click", showAllErrorMessages);

  $("input", form).on("keypress", function (event) {
    var type = $(this).attr("type");
    if (/date|email|month|number|search|tel|text|time|url|week/.test(type) &&
      event.keyCode == 13) {
      showAllErrorMessages();
    }
  });
};

$("form").each(createAllErrors);

// Upon loading, start the game
$(document).ready(function () {
  console.log('Game Loaded');

  $("#hostForm").hide();
  $("#joinForm").hide();

  mainMenuEntranceAnimation();
});

function startGame() {
  inGame = true
  doStartGameAnimation(postKeybaordGame);

  function postKeybaordGame() {

    resetLists();
    showLists();

    // Allows players to shoot, but shooting too early will result in a pre-fire shot, therefore losing the game
    canShoot = true;
    preShot = true;

    setTimeout(displayShoot, getShootDelay(0))
  }
}

const leftKeys = [192, 49, 50, 51, 52, 53, 54, 9,
  81, 87, 69, 82, 84, 20, 65, 83, 68, 70, 71, 90, 88, 67, 86
];
const rightKeys = [55, 56, 57, 48, 189, 187, 8,
  89, 85, 73, 79, 80, 219, 221, 72, 74, 75, 76, 186, 222, 220, 66, 78, 77,
  188, 190, 191, 34, 33, 35, 36, 46
];
const space = 32;
const esc = 27;
const enter = 13;

function isLeft(keyID) {
  for (i in leftKeys) {
    if (keyID == leftKeys[i]) {
      return true;
    }
  }
  return false;
}

function isRight(keyID) {
  for (i in rightKeys) {
    if (keyID == rightKeys[i]) {
      return true;
    }
  }
  return false;
}

function gotoLocalGame() {
  isMainMenu = false;
  isInLocalGame = true;

  $("#pOffline").animate({
    left: 0,
    right: 0,
    top: "8%",
    fontSize: "68px"
  }, {
    duration: 800,
    queue: false
  });
  $("#pMenuMultiplayer").stop().fadeOut(fade);
  $("#pOnline").stop().fadeOut(fade);
  $("#pOnlineDesc").stop().fadeOut(fade);
  $("#pOfflineDesc").stop().fadeOut(fade);
  $("#kLeftMenu").fadeOut({
    duration: fade,
    queue: false
  });
  $("#kRightMenu").fadeOut({
    duration: fade,
    queue: false
  });
  $("#kDownMenu").fadeOut({
    duration: fade,
    queue: false
  });
  startGame();
}

function gotoOnlineGameMenu() {
  isMainMenu = false;
  isOnlineMenu = true;
  preventKeyPress = true;

  function allowKeys() {
    preventKeyPress = false;
  }
  // Gives the player half the transition time to prevent accidental keypresses
  setTimeout(allowKeys, fade / 2);

  $("#pOffline").stop().fadeOut(fade);
  $("#pMenuMultiplayer").stop().fadeOut(fade);
  $("#pOnline").stop().fadeOut(fade);
  $("#pOnlineDesc").stop().fadeOut(fade);
  $("#pOfflineDesc").stop().fadeOut(fade);
  $("#kLeftMenu").animate({
    top: "35%"
  }, {
    duration: 800,
    queue: false
  }).animate({
    right: "200px"
  }, {
    duration: 800,
    queue: false
  });
  $("#kRightMenu").animate({
    top: "35%"
  }, {
    duration: 800,
    queue: false
  }).animate({
    left: "190px"
  }, {
    duration: 800,
    queue: false
  });
  $("#kDownMenu").stop().fadeIn({
    duration: fade,
    queue: false
  }).animate({
    top: "45%"
  }, {
    duration: 800,
    queue: false
  });
  $("#pJoin").stop().fadeIn(fade);
  $("#pHost").stop().fadeIn(fade);
  $("#pJoinRandom").stop().fadeIn(fade);
  $("#pEscText").css("right", 0).css("top", "11.5%").stop().fadeIn(fade);
}

function mainMenuEntranceAnimation() {

  function showText() {
    // For some reason you've gotta put this in here otherwise it'll break the animation when quickly going to the online menu
    if (isMainMenu || isInLocalGame) {
      $("#pOffline").css("fontSize", "48px").css("top", "35%").css("left", "420px").fadeIn(800);
    }
    if (isMainMenu) {
      $("#pOnline").fadeIn({
        duration: 800,
        queue: false
      });
      $("#pOnlineDesc").fadeIn(800);
      $("#pOfflineDesc").fadeIn(800);

      function spaceAnim() {
        if (isMainMenu) {
          $("#kDownMenu").animate({
            top: "110%"
          }, 800).fadeOut({
            duration: 400,
            queue: false
          });

          $("#kLeftMenu").animate({
            right: "200px"
          }, 800);

          $("#kRightMenu").animate({
            left: "190px"
          }, 800);
        }
      }
      setTimeout(spaceAnim, 600);
    }
  }
  setTimeout(showText, 300);

  $("#pMenuMultiplayer").fadeIn(600);

  $("#kDownMenu").css("top", "50%").hide().fadeIn(600);
  $("#kLeftMenu").css("right", "0px").hide().fadeIn(600);
  $("#kRightMenu").css("left", "0px").hide().fadeIn(600);
}

function addItemToList(listID, str) {
  var ul = document.getElementById(listID);
  var li = document.createElement("li");
  li.appendChild(document.createTextNode(str));
  ul.appendChild(li);

  var dir = Math.random() >= 0.5 ? 1 : -1;

  $("#lFailList").shake(dir);
  $("#lWinList").shake(dir);
  $("#pShoot").shake(dir);
}

function keyboardAnimation() {
  $("#kLeft").css("left", "-110%").show().animate({
    left: 0
  }, 1000, function () {
    $('#kLeft').slideToggle();
  });
  $("#kRight").css("right", "-110%").show().animate({
    right: 0
  }, 1000, function () {
    $('#kRight').slideToggle();
  });
  $("#kDown").css("top", "110%").show().animate({
    top: "35%"
  }, 1000, function () {
    $('#kDown').slideToggle(1200);
  });
}

function resetLists() {
  $("#lWinList").css("fontSize", "48px");
  $("#lWinList").css("top", "30%");
  $("#lWinList").css("left", "550px");
  $("#lFailList").css("fontSize", "48px");
  $("#lFailList").css("top", "30%");
  $("#lFailList").css("left", "-390px");
  $("ul").empty();
}

function showLists() {
  $("#lWinList").show();
  $("#lFailList").show();
}

// Hides fail list and "SHOOT" text, focuses the win list in the center of the screen
function focusLists() {
  $('#lWinList').animate({
    left: "0px"
  }, {
    duration: 1000,
    queue: false
  });
  $('#lWinList').animate({
    top: "22%"
  }, {
    duration: 1000,
    queue: false
  });
  $('#lWinList').animate({
    fontSize: "68px"
  }, 1000);

  $('#lFailList').animate({
    top: "110%"
  }, 1000);
  $("#lFailList").fadeOut({
    duration: fade,
    queue: false
  });

  $('#pShoot').animate({
    top: "110%"
  }, 1000, function () {
    $("#pShoot").css("top", "45%");
  });
  $("#pShoot").fadeOut({
    duration: fade,
    queue: false
  });

  if (winCount == 0) {
    $("#pFinished").css("top", "45%");
    $("#pEscText").css("top", "11.5%");
  } else {
    $("#pFinished").css("top", "10%");
    $("#pEscText").css("top", "4%")
  }
  $("#pFinished").fadeIn(fade);
  $("#pEscText").fadeIn(fade);
  /*$('#lFailList').animate({
    left: "-430px"
  }, {
    duration: 1000,
    queue: false
  });
  $('#lFailList').animate({
    top: "20%"
  }, {
    duration: 1000,
    queue: false
  });
  $('#lFailList').animate({
    fontSize: "68px"
  }, 1000);*/
}

function hideLists() {
  $("#pShoot").fadeOut(fade);
  $('#lWinList').animate({
    top: "110%"
  }, 1000);
  $("#lWinList").fadeOut({
    duration: fade,
    queue: false
  });
  $("#pFinished").fadeOut({
    duration: fade,
    queue: false
  }).animate({
    top: "-50%"
  }, 1000);
  $("#pEscText").fadeOut({
    duration: fade,
    queue: false
  }).animate({
    top: "-50%"
  }, 1000);
}

// The max time it'll take to display "SHOOT"
const maxGameDelay = 6000;
// The time it takes for text to fade in or out
const fade = 500;
// The time that the "Ready" and "Steady" text is displayed before fading
const linger = 1000;
// The maximum game time that players are allowed to shoot in
const maxShootTime = 1500;
// The minimum time to wait before having the chance to display "SHOOT". This is to ensure that it doesn't say "SHOOT" while still displaying "Ready" or "Steady"
const timoutMin = (linger * 2) + (fade * 4);


function getShootDelay(minimum) {
  function randomNumberFromRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  return randomNumberFromRange(minimum, minimum + maxGameDelay);
}

function displayShoot() {
  if (isInLocalGame) {
    $("#pShoot").show();

    //document.getElementById("shootText").innerHTML = "SHOOT";
    shootTime = Date.now();
    preShot = false;

    setTimeout(postGame, maxShootTime);
  }
}

function doStartGameAnimation(method) {
  keyboardAnimation();
  setTimeout(readySteadyAnimation, 1200);

  function readySteadyAnimation() {
    $("#pReady").fadeIn(fade).delay(linger).fadeOut(fade);
    $("#pSteady").delay(linger + (fade * 2)).fadeIn(fade).delay(linger).fadeOut(
      fade);
    $("#pOffline").delay(timoutMin - fade).fadeOut(fade);

    setTimeout(method, timoutMin);
  }
}

function postGame() {
  if (inGame) {
    inGame = false;
    canShoot = false;
    focusLists();
  }
}

function resetGame() {
  shootTime = 0;
  inGame = false;
  canShoot = false;
  downKeys = [];
  winCount = 0;

  hideLists();
}

var shootTime = 0;
var inGame = false;
var preShot = false;
var canShoot = false;
var downKeys = [];
var winCount = 0;