<script setup lang="ts">
import { legal } from '~/utils/legal'

useHead({
  title: 'Privacy Policy — Timely',
  meta: [{ name: 'description', content: 'How Timely handles personal data, under the GDPR.' }]
})
</script>

<template>
  <LegalPage title="Privacy Policy">
    <p>
      This policy explains what personal data Timely handles, why, and what you can do about it. It follows the
      EU General Data Protection Regulation (GDPR). Timely is a personal planning app in a test phase, run by
      {{ legal.operatorName }}, an individual in {{ legal.country }}.
    </p>

    <h2>In short</h2>
    <ul>
      <li><strong>Without an account</strong>, your planner stays in your browser. Nothing is sent to us.</li>
      <li><strong>With an account</strong>, your planner is stored in the operator's Supabase database, one row per user.</li>
      <li>There is <strong>no analytics, no advertising, no tracking, and no selling of data</strong>. This is not planned for now.</li>
    </ul>

    <h2>Who is responsible</h2>
    <p>
      For the personal data described here, {{ legal.operatorName }} is the controller. Contact:
      <a :href="`mailto:${legal.contactEmail}`" class="legal-link">{{ legal.contactEmail }}</a>.
    </p>

    <h2>What data we handle</h2>
    <ul>
      <li>
        <strong>Sign-in:</strong> your email address, so that Supabase can send you a sign-in link.
      </li>
      <li>
        <strong>Google sign-in</strong> (only if you choose it): Google shares your basic profile with Supabase, your email
        address and, where Google provides them, your name and profile picture. Timely does not use the name or picture,
        but Supabase keeps them with your account.
      </li>
      <li>
        <strong>Your planner</strong>: everything you type into Timely, such as your ambition, life areas, goals, habits,
        activities, weekly templates and journal notes. This can be personal, and sometimes sensitive, depending on what
        you write. Only enter what you are comfortable storing.
      </li>
      <li>
        <strong>Technical data</strong>: our providers process technical data needed to deliver the service, such as your
        IP address in server and security logs.
      </li>
    </ul>

    <h2>Without an account and with an account</h2>
    <p>
      <strong>Without an account</strong> (local mode), your planner is saved in your browser's local storage. It is
      never sent to us or to any provider, so the operator cannot see it.
    </p>
    <p>
      <strong>With an account</strong> (Supabase mode), your planner is saved as one row in the Supabase project that the
      operator runs, in the region {{ legal.supabaseRegion }}. Only your signed-in session can read or change that row.
    </p>

    <h2>Why we use it, and the legal basis</h2>
    <p>
      We use your data only to provide Timely to you: to sign you in, and to store and show your planner. The legal basis
      is that this is necessary to deliver the service you ask for (Article 6(1)(b) GDPR). Timely does not use consent for
      any processing at present, and it does not use your data for any other purpose.
    </p>

    <h2>Browser storage</h2>
    <p>
      Timely uses your browser's local storage for things it needs to work: your planner in local mode, your sign-in session
      in account mode, and your light or dark theme. These are strictly necessary. Timely sets no tracking cookies and
      loads no third-party trackers, so no cookie banner is shown.
    </p>

    <h2>Who receives your data</h2>
    <ul>
      <li><strong>Supabase</strong> provides the database and sign-in, in the region above.</li>
      <li><strong>Vercel</strong> hosts the app. It may keep technical server logs, which can include IP addresses.</li>
      <li><strong>Google</strong> receives the sign-in only if you choose Google sign-in. Google Fonts also serves the Timely typeface to every visitor's browser, so Google receives your IP address when the font loads.</li>
    </ul>
    <p>
      The operator does not sell data or share it for advertising. Some providers may process data outside the EU/EEA. Where
      they do, they say they rely on standard safeguards for such transfers.
    </p>

    <h2>Security</h2>
    <ul>
      <li>Traffic between your browser and Timely is encrypted (HTTPS).</li>
      <li>Supabase encrypts stored data at rest.</li>
      <li>Row level security means that each signed-in user can read and change only their own row.</li>
    </ul>
    <p>
      These measures have limits. Your data is not end-to-end encrypted, so the operator and the hosting and database
      providers can technically access stored data. No system is perfectly secure. Keep your own copies of anything important.
    </p>

    <h2>How long we keep it</h2>
    <p>
      In account mode, your planner is kept until you reset it with Reset my data (see Your rights) or ask us to delete your
      account, or until the test phase ends. If the test phase ends, we will tell you in advance what happens to stored data.
      In local mode, your data stays in your browser until you reset it or clear the site data for Timely.
    </p>

    <h2>Your rights</h2>
    <p>You can ask us to:</p>
    <ul>
      <li>give you access to the personal data we hold about you;</li>
      <li>correct data that is wrong;</li>
      <li>
        erase your data. In account mode you can erase your planner yourself: open <strong>Account</strong> in the top bar and
        choose <strong>Reset my data</strong>. It deletes your goals, habits, activities, weeks and journal notes, and keeps your
        sign-in. Deleting your sign-in account and your email address is still done on request by email;
      </li>
      <li>restrict how we use your data;</li>
      <li>give you your data in a portable form;</li>
      <li>object to our processing.</li>
    </ul>
    <p>
      Write to <a :href="`mailto:${legal.contactEmail}`" class="legal-link">{{ legal.contactEmail }}</a>. We answer within one
      month, as the GDPR requires. You also have the right to complain to a data protection authority, for example in your
      country of residence.
    </p>

    <h2>Children</h2>
    <p>
      Timely is not intended for children under 16, and we do not knowingly collect their data. If you think a child has
      given us data, contact us and we will delete it.
    </p>

    <h2>Changes to this policy</h2>
    <p>
      If the operator later wants to collect usage statistics, this policy will be updated first, and the "last updated"
      date will change. Where the law requires it, consent will be asked before any such collection.
    </p>
  </LegalPage>
</template>
