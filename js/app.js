/*
Copyright (C) 2024 Lance Borden, Sariah Echols

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 3.0
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.

*/

document.addEventListener("alpine:init", () => {
  /* Store that handles the websocket
  and the communication events for it*/
  Alpine.store("socket", {
    hasConnected: false,
    connectionFailed: false,
    socket: null,
    joinCode: null,
    code2Ip() {
      let ipValue = 0;
      for (let i = 0; i < this.joinCode.length; i++) {
        // ASCII value of a is 97
        ipValue = ipValue * 26 + (this.joinCode.charCodeAt(i) - 97);
      }
      const byte1 = (ipValue >> 24) & 255;
      const byte2 = (ipValue >> 16) & 255;
      const byte3 = (ipValue >> 8) & 255;
      const byte4 = ipValue & 255;

      return `ws://${byte1}.${byte2}.${byte3}.${byte4}`;
    },
    connect() {
      this.socket = new WebSocket(this.code2Ip(this.joinCode));
      console.log("socket created");

      this.socket.addEventListener("open", (event) => {
        console.log("connection established");
        this.hasConnected = true;
      });

      this.socket.addEventListener("message", (event) => {
        this.handleMessage(event.data);
      });

      this.socket.addEventListener("error", (event) => {
        console.error("WebSocket error:", error);
      });

      this.socket.addEventListener("close", (event) => {
        console.log("connection closed");
        this.hasConnected = false;
        this.connectionFailed = true;
      });
    },
    // all outgoing messages need to go thru here
    sendMessage(message) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(message);
      } else {
        console.error(
          "WebSocket is not open. Ready state is:",
          this.connection.readyState
        );
      }
    },
    // all incoming messages need to be delegated here
    handleMessage(message) {
      const data = JSON.parse(message);
      if (data.type === "requestChars") {
        Alpine.store("charHandler").handleCharacterRequest(data);
      }
    },
  });

  /* Data to handle reactivity 
  to the connect button */
  Alpine.data("connectMessage", () => ({
    connecting: false,
    connectClicked() {
      this.connecting = true;
      this.$store.socket.connectionFailed = false;
      this.$store.socket.connect();
    },
  }));

  /* Data for the user upon login
  handles if they select player or dm*/
  Alpine.data("user", () => ({
    hasSelected: false,
    isPlayer: false,
    choosePlayer() {
      this.hasSelected = true;
      this.isPlayer = true;
      console.log("requesting characters");
      const jsonMessage = JSON.stringify({ type: "requestChars", content: "" });
      this.$store.socket.sendMessage(jsonMessage);
    },
    chooseDm() {
      this.hasSelected = true;
      this.isPlayer = false;
    },
  }));

  /* Data for the new/existing
  character menu selection */
  Alpine.data("charMenu", () => ({
    hasSelected: false,
    pickNew: false,
    chooseNew() {
      this.hasSelected = true;
      this.pickNew = true;
    },
    chooseExisting() {
      this.hasSelected = true;
      this.pickNew = false;
    },
  }));

  // the input form for making a character
  Alpine.data("characterForm", () => ({
    formPage: 1,
    imageFile: null,
    charName: "",
    charRace: "",
    charClass: "",
    charLevel: null,
    charAC: null,
    charHP: null,
    // these ones are weird cuz of how the html is formatted
    Strength: null,
    Dexterity: null,
    Constitution: null,
    Intelligence: null,
    Wisdom: null,
    Charisma: null,
    nextPage() {
      this.formPage++;
    },
    sendCharacter() {
      if (this.imageFile) {
        const reader = new FileReader();
        reader.onload = () => {
          // idk if this is the best way but this apparently removes the header
          // from the data. The header is at [0] and the data is at [1]
          const imageData = reader.result.split(",");
          const jsonMessage = JSON.stringify({
            type: "sendCharacter",
            image: {
              header: imageData[0],
              raw: imageData[1],
            },
            character: {
              name: this.charName,
              race: this.charRace,
              class: this.charClass,
              level: this.charLevel,
              ability_scores: {
                strength: this.Strength,
                dexterity: this.Dexterity,
                constitution: this.Constitution,
                intelligence: this.Intelligence,
                wisdom: this.Wisdom,
                charisma: this.Charisma,
              },
              // these are placeholder values
              // we need to expand the form later
              saving_throws: {
                strength: this.Strength,
                dexterity: this.Dexterity,
                constitution: this.Constitution,
                intelligence: this.Intelligence,
                wisdom: this.Wisdom,
                charisma: this.Charisma,
              },
              stats: {
                speed: this.charSpeed,
                ac: this.charAC,
                hp: this.charHP,
              },
              // unused so far, gonna have to figure out the form
              // especially with how tricky spells can be
              // will likely need a searchable select field to all all those
              weapons: [],
              spells: [],
              proficiencies: [],
            },
          });
          this.$store.socket.sendMessage(jsonMessage);
        };

        reader.readAsDataURL(this.imageFile);
      } else {
        alert("need to upload an image");
      }
    },
  }));

  // Store to handle the character requests
  Alpine.store("charHandler", {
    existingChars: [],
    handleCharacterRequest(data) {
      console.log("recieved character request");
      this.existingChars = data.chars;
    },
  });

  // Data for all dropdown fields
  Alpine.data("dropdownState", () => ({
    // ensures the label moves up after being interacted with
    checkSelect(select) {
      if (select.value) {
        select.classList.add("has-value");
      } else {
        select.classList.remove("has-value");
      }
    },
    init() {
      this.checkSelect(this.$refs.select);

      // Ensure label transitions correctly on focus for mobile
      this.$refs.select.addEventListener("focus", () => {
        this.$refs.select.classList.add("has-value");
      });
      this.$refs.select.addEventListener("blur", () => {
        this.checkSelect(this.$refs.select);
      });
    },
  }));
});
