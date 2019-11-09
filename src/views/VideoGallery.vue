<template>
  <div>
    <!-- APP BAR -->
    <v-app-bar app clipped-left color="white" dense>
      <v-app-bar-nav-icon @click.stop="toggleDrawer()" />
      <v-toolbar-title class="mr-12 align-center">
        <span class="title">{{ $route.params.class_id }}</span>
      </v-toolbar-title>
    </v-app-bar>

    <!-- CONTENT -->
    <v-content>
      <template v-if="classDoc != {}">
        <vuetify-tabs 
          v-if="classDoc.tabs"
          :tabs="classDoc.tabs"
          @tabs-rename="newValues => renameTabs(newValues)"
        >
          <template v-slot:default="{ tabs }">
            <v-tab-item v-for="(tab, i) in tabs" :key="`tab--item--${i}`"> 
              <videos :tabNumber="i" :tabs="tabs"/>
            </v-tab-item>
          </template>
        </vuetify-tabs>
      </template>
    </v-content>
  </div>
</template>

<script>
import VuetifyCard from "@/components/VuetifyCard.vue"
import BetaDoodleVideo from "@/components/BetaDoodleVideo.vue"
import DoodleVideo from "@/views/DoodleVideo.vue"
import Videos from "@/components/Videos.vue"
import VuetifyTabs from "@/components/VuetifyTabs.vue"
import db from "@/database.js"
import firebase from "firebase/app"
import "firebase/functions"
import "firebase/storage"

export default {
  components: {
    VuetifyCard,
    VuetifyTabs,
    BetaDoodleVideo,
    DoodleVideo,
    Videos
  },
  data () {
    return {
      video: null,
      audioURL: "",
      whiteboards: [],
      classDoc: {},
      whiteboardPopup: false,
      currentVideoID: ""
    }
  },
  computed: {
    user () {
      return this.$store.state.user
    }
  },
  created () {
    const classID = this.$route.params.class_id
    const classRef = db.collection("classes").doc(classID)
    classRef.get().then(doc => {
      this.classDoc = doc.data()
    })
  },
  methods: {
    toggleDrawer () {
      this.$root.$emit("toggle-drawer")
    },
    handleAction (buttonName, { courseNumber, ".key": videoID, audioPath }, canvasID) {
      if (buttonName == "FULL VIDEO") {
        this.currentVideoID = videoID 
        this.whiteboardPopup = true
      } else if (buttonName == "PREVIEW") {
        const videoElem = this.$refs[`doodle-video-${canvasID}`][0]
        videoElem.quickplay()
      } else if (buttonName == "delete") {
        this.deleteVideo(videoID, audioPath)
      }
    },
    async renameTabs (newValues) {
      const ref = db.collection("classes").doc(this.$route.params.class_id)
      await ref.update({
        tabs: newValues
      })
      const classDoc = await ref.get()
      this.classDoc = classDoc.data()
    },
    async saveParagraph (newValue, { ".key": videoID }) {
      const ref = db.collection("whiteboards").doc(videoID)
      await ref.update({
        paragraph: newValue
      })
    },
    async deleteVideo (ID, audioPath) {
      const recursiveDelete = firebase.functions().httpsCallable('recursiveDelete')
      recursiveDelete({ path: `whiteboards/${ID}` })
      // delete audio 
      if (audioPath) {
        const storageRef = firebase.storage().ref()
        // TODO: audio file fails to delete 
        const audioFileRef = storageRef.child(`recordings/${audioPath}`)
        audioFileRef.delete()
      }      
    },
    checkPermission (video) {
      if (!this.user) {
        return false
      } 
      if (video.authorUID == this.user.uid || this.user.email == "eltonlin1998@gmail.com") {
        return true 
      } 
      return false 
    },
    getGapWidth () {
      return this.$vuetify.breakpoint.smAndDown ? 0 : 30
    },
    getSideMargin () {
      if (this.$vuetify.breakpoint.xs) {
        return 0
      } 
      return this.$vuetify.breakpoint.sm ? 2 : 5
    }
  }
}
</script>