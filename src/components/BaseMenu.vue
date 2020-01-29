<template>
  <div class="text-xs-center">
    <v-menu v-model="menu" :close-on-content-click="false" :nudge-width="200" offset-x>
      <template v-slot:activator="{ on }">
        <slot :on="on"></slot>
      </template>

      <v-card>
        <v-list>
          <v-list-item>
            <v-list-item-avatar>
              <v-icon large :color="color">account_circle</v-icon>
              <!-- <img src="https://cdn.vuetifyjs.com/images/john.jpg" alt="John"> -->
            </v-list-item-avatar>

            <v-list-item-content>
              <v-text-field
                placeholder="Enter your name here"
                :value="user.name"
                @input="value => name = value"
                single-line
              />
            </v-list-item-content>

            <v-list-item-action>
              <v-btn :class="fav ? 'red--text' : ''" icon @click="fav = !fav">
                <!-- <v-icon>favorite</v-icon> -->
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <v-divider></v-divider>

        <v-list>
<<<<<<< HEAD
          <v-list-item v-for="(s, i) in user.enrolledClasses" :key="i">
            <v-container>
              <v-list-item-title>{{s.name}}</v-list-item-title>
              <v-list-item-action v-if="s.settings">
                <v-radio-group v-model="s.settings.notifications.newQuestion" row>
                  <v-radio
                    v-for="x in newQNotifs"
                    :key="x"
                    @change="classNotifChanged(i, x)"
                    :label="x"
                    :value="x"
                    :id="x"
                  />
                </v-radio-group>
              </v-list-item-action>
            </v-container>
=======
          <v-list-item>
            <v-list-item-action>
              <v-switch v-model="message" color="purple"></v-switch>
            </v-list-item-action>
            <v-list-item-title>Enable notifications</v-list-item-title>
>>>>>>> parent of 5abb4bf... add enrollement srevice, changed enrolledClasses strucutre, made the home page reactive to the new Class Name/ID seperation, added the change notification feature, commented out the tags feature until it is fully functional
          </v-list-item>
        </v-list>
        <v-card-actions>
          <!-- <v-spacer></v-spacer> -->
          <!-- <v-btn flat @click="menu = false">Cancel</v-btn> -->
          <v-btn color="primary" text @click="handleSave()">Save</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="$emit('sign-out')">Sign Out</v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>

<script>
<<<<<<< HEAD
import "vue-swatches/dist/vue-swatches.min.css";
import { initEnrollementService } from "../dep";
=======
import Swatches from 'vue-swatches'
import 'vue-swatches/dist/vue-swatches.min.css'
>>>>>>> parent of 5abb4bf... add enrollement srevice, changed enrolledClasses strucutre, made the home page reactive to the new Class Name/ID seperation, added the change notification feature, commented out the tags feature until it is fully functional

export default {
  props: {
    user: Object
  },
  data: () => ({
    fav: true,
    menu: false,
    name: "",
    useDarkMode: false,
    color: "",
    colors: [
      "black",
      "grey",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple"
    ],
    newQNotifs: ["always", "daily", "never"],
    enrollementService: initEnrollementService()
  }),
  methods: {
    handleSave() {
      this.menu = false;
      const updatedUser = {
        useDarkMode: this.useDarkMode
        // color: this.color
      };
      if (this.name) updatedUser.name = this.name;
      else updatedUser.name = this.user.name;
      this.$emit("save", updatedUser);
    },
<<<<<<< HEAD
    classNotifChanged(classID, frequency) {
      this.enrollementService.changeNotification(
        this.user,
        classID,
        "newQuestion",
        frequency
      );
=======
    data: () => ({
      fav: true,
      menu: false,
      message: false,
      name: "",
      useDarkMode: false,
      color: "",
      colors: ["black", "grey", "red", "orange", "yellow", "green", "blue", "purple"]
    }),
    methods: {
      handleSave () {
        this.menu = false 
        const updatedUser = {
          useDarkMode: this.useDarkMode,
          // color: this.color
        }
        if (this.name) {
          updatedUser.name = this.name
        } else {
          updatedUser.name = this.user.name
        }
        this.$emit("save", updatedUser)
      }
>>>>>>> parent of 5abb4bf... add enrollement srevice, changed enrolledClasses strucutre, made the home page reactive to the new Class Name/ID seperation, added the change notification feature, commented out the tags feature until it is fully functional
    }
  }
};
</script>