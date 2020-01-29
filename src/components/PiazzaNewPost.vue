<!-- Offer the user a text area + blackboard to create a Q or A -->
<template>
  <div id="new-post">
    <v-banner single-line sticky class="post-header container py-0" tag="header">
      <h3>New {{ postType }}</h3>
      <template v-slot:actions>
        <v-btn @click="submitPost()" color="accent">Post <v-icon small class="pl-2">send</v-icon></v-btn>
      </template>
    </v-banner>
    <v-container tag="section" class="py-5">
      <v-textarea
        filled
        :label="postType"
        :placeholder="`Type ${postType} here...`"
        v-model="postDescription"
      />

        <v-container v-if="withTags">
            <div id="Tags">
                <SearchBar
                label="Enter a Tag"
                :items="tagsPool"
                @submit="addTag"
                />
                
                <Tags
                :items="postTags"
                :removable="true"
                @delete="deleteTag"
                />
            </div>
        </v-container>

      <div class="blackboard-container">
        <BlackboardMini 
          ref="blackboard-mini"
          :visible="visible"
          :background="addedImage"
          @boardImage="boardImage"
        />
      </div>
    </v-container>
  </div>
</template>

<script>
import Vue from 'vue';
import DoodleVideo from "@/components/DoodleVideo.vue"
import BlackboardMini from "@/components/BlackboardMini.vue"
import SearchBar from '@/components/SearchBar.vue'
import Tags from "@/components/Tags.vue"

export default {
  props: {
    postType: String, // either "question" or "answer"
    visible: Boolean,
    tagsPool: Array,
    withTags: Boolean
  },
  components: {
    BlackboardMini,
    Tags,
    SearchBar
  },
  data: () => ({
    postTitle: "",
    postDescription: "",
    blackboardAttached: true,
    imageAdded: false,
    addedImage: '',
    changeImage: false,
    postTags: [],
    reRenderTags: 0,
    anonymous: false
  }),
  methods: {
    submitPost () {
      if (!this.postTitle) return 
      // take a snapshot of the text, images, drawings and audio that the user has created
      // event.preventDefault()
      const BlackboardMini = this.$refs["blackboard-mini"]
      const blackboardID = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      const post = { title: this.postTitle, 
                     description: this.postDescription, 
                     blackboardID,
                     postTags : this.postTags,
                     audioURL: BlackboardMini.audioURL,
                     date: this.getDate(),
                     image: this.addedImage,
                     isAnonymous: this.anonymous
                   }
      const payloads = { post, boardStrokes: BlackboardMini.allStrokes}
      this.$emit('post-submit', payloads)

      ///TODO possibly delete the current answer because it persists?
    },
    getDate () {
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = today.getFullYear()
      return today = mm + '/' + dd + '/' + yyyy
    },
    boardImage (boardImage) {
      if (boardImage) {
        this.imageAdded=true
        this.addedImage=boardImage
        this.changeImage=false
      }
    },
    getFullWidth () {
      // sidenav's width = 200, BaseList's width = 300 
      return window.innerWidth - 500 
    },
    clickImage () {
      this.$refs['blackboard-mini'].$refs.background.$el.click()
    },
    addImage () {
      this.imageAdded=true;
      var file = document.getElementById('img-input').files[0];
      var reader = new FileReader();

      reader.addEventListener("load", ()=> {
        this.addedImage = reader.result;
      }, false);

      if (file) {
        reader.readAsDataURL(file);
      }
    },
    removeImage() {
      this.imageAdded=false;
      //this.addedImage=''
      Vue.set(this,'addedImage','')
    },
    //Start of Tags functions
    addTag(tag) {
        for(let t of this.postTags){
            if(t == tag)return
        }
        this.postTags.push(tag)
    },
    deleteTag(tag) {
        this.postTags = this.postTags.filter(x => {return x != tag})
    }
    //End of Tags functions
  }
}
</script>