<template>
  <v-layout row justify-center>
    <v-dialog v-model="value" persistent max-width="600px">
      <v-card>
        <v-card-text>
          <v-container grid-list-md>
            <v-layout wrap>
              <v-flex xs12>
                <v-text-field v-model="email" label="Email" required/>
              </v-flex>
              <v-flex xs12 v-if="newAccount">
                <v-text-field 
                  v-model="password" 
                  v-on:keyup.enter="$emit('create-account', { email,  password })" 
                  label="Password" 
                  type="password" 
                  required
                />
              </v-flex>
              <v-flex xs12 v-else>
                <v-text-field 
                  v-model="password" 
                  v-on:keyup.enter="$emit('sign-in', { email,  password })" 
                  label="Password" 
                  type="password" 
                  required
                />
              </v-flex>
              <!-- <v-flex xs12 v-if="newAccount">
                <v-text-field v-model="nickname" label="Nickname" required/>
              </v-flex> -->
            </v-layout>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="$emit('input', !value)" color="blue darken-1" text>
            CANCEL
          </v-btn>
          <v-btn @click="$emit('sign-in', { email,  password })" color="blue darken-1" text>
            LOG IN
          </v-btn>
          <v-btn @click="$emit('create-account', { email,  password })" color="purple" text>
            CREATE ACCOUNT
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-layout>
</template>

<script>
export default {
  props: {
    value: Boolean,
    newAccount: Boolean
  },
  data: () => ({
    email: '',
    password: '',
    nickname: ''
  }),
  methods: {
    handleLogin() {
      this.$emit('login', { email: this.email, password: this.password })
    }
  }
}
</script>