# ServiceSlot — Appointment Request Demo

ServiceSlot is a responsive appointment-request interface for a fictional home-services business. It demonstrates a customer booking flow and a small local request queue built with React, Bootstrap 5, and Vite.

**Live demo:** https://serviceslot.vercel.app  
**Source code:** https://github.com/wdf-5618/serviceslot

## Features

- Choose a service, date, and available time slot.
- Submit a request with customer contact details and optional notes.
- Validate required details and avoid duplicate active time slots on the same browser.
- Review saved requests in a small queue.
- Filter requests by status and move them from Pending to Confirmed or Completed.
- Cancel or remove local demo records.
- Keep records in browser localStorage so they survive refreshes in the same browser.
- Responsive layout, keyboard-usable controls, and status messages.

## Run locally

Requires Node.js 22.12 or newer.

~~~bash
npm install
npm run dev
~~~

Vite prints the local URL after starting. To create and preview a production build:

~~~bash
npm run build
npm run preview
~~~

## Stack

- React 19
- Vite 8
- Bootstrap 5
- Plain CSS for app-specific styling
- Browser localStorage for demo-only persistence

## Important limitations

This version is a front-end learning prototype. It does not send emails or notifications, connect to a server or database, reserve a real business calendar, or sync information across devices. The fictional services and prices are examples only. A real booking product would need a backend, server-side conflict checking, business availability settings, secure access controls, and a reliable notification process.

## Manual test checklist

- [ ] Submit a request with valid details.
- [ ] Try submitting without the required name or email.
- [ ] Confirm that an active request blocks the same date and time slot on this browser.
- [ ] Refresh the page and confirm that local demo requests remain.
- [ ] Filter the queue and change a request's status.
- [ ] Cancel a request and confirm its time slot becomes available again.
- [ ] Check the layout on a narrow mobile screen.

The automated production build and repository checks will be reported separately from these manual browser tests.
