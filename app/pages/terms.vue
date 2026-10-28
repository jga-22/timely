<script setup lang="ts">
import { legal } from '~/utils/legal'

useHead({
  title: 'Terms of Use — Timely',
  meta: [{ name: 'description', content: 'The terms for using Timely, a personal planning app in a test phase.' }]
})
</script>

<template>
  <LegalPage title="Terms of Use">
    <p>
      These terms apply to Timely, a personal planning app. Timely is free and in a test phase. It is run by
      {{ legal.operatorName }}, an individual in {{ legal.country }}. By using Timely you accept these terms.
      For how your personal data is handled, read the <NuxtLink to="/privacy" class="legal-link">Privacy Policy</NuxtLink>.
    </p>

    <h2>Using Timely</h2>
    <ul>
      <li>Timely is for your own personal planning. Use it for lawful purposes only.</li>
      <li>You sign in with an email link or with Google. Keep access to that email account or Google account safe, because anyone who can open it can sign in to Timely as you.</li>
      <li>Do not try to break into the service, overload it, or access other people's data.</li>
    </ul>

    <h2>Your content</h2>
    <p>
      You own what you write in Timely: your ambition, life areas, goals, habits, activities, week types and notes.
      You are responsible for it. The operator needs only enough access to store it, show it to you and run the service,
      as the Privacy Policy describes.
    </p>

    <h2>Test phase and availability</h2>
    <ul>
      <li>Timely is provided "as is", without warranty of any kind, and without a guarantee that it is available or error free.</li>
      <li>Features can change, and data can be reset or lost during testing.</li>
      <li>Keep your own copies of anything important.</li>
    </ul>

    <h2>Liability</h2>
    <p>
      To the extent the law allows, the operator is not liable for lost data or for indirect loss arising from your use of Timely.
      Nothing in these terms limits a liability that the law does not allow to be limited, and nothing affects the mandatory
      consumer rights you have in your country.
    </p>

    <h2>Suspension and ending the service</h2>
    <p>
      The operator may suspend your access if you break these terms, and may change or end Timely. If Timely is going to end,
      the operator will tell you in advance where that is possible, and will say what happens to stored data.
    </p>

    <h2>Changes to these terms</h2>
    <p>
      The operator may update these terms. The "last updated" date shows the latest version. If you keep using Timely after
      a change, you accept the new terms.
    </p>

    <h2>Governing law and contact</h2>
    <p>
      These terms are governed by {{ legal.governingLaw }}. For questions about these terms, write to
      <a :href="`mailto:${legal.contactEmail}`" class="legal-link">{{ legal.contactEmail }}</a>.
    </p>
  </LegalPage>
</template>
