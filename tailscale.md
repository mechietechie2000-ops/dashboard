# How to add device to Tailscale
Download Tailscale for Mac
Enable Network Extension
    Settings -> General -> Extension -> Network Extension -> Tailscale Network Extension -> Toggle ON 

Use same email ID to logging to Tailscale (mechietechie2000@gmail.com)


# Troubleshoot Tailscale
If you installed Tailscale using Homebrew (CLI)

First check whether you're logged in:

tailscale status

If it says you're logged out, run:

sudo tailscale up

or

tailscale up

(depending on how it's installed).

This will print a URL similar to:

To authenticate, visit:

https://login.tailscale.com/...

Open that URL in your browser, log in, and your Mac will be authenticated.

If you already have the app but don't see a Login option

Run:

tailscale status

If it reports:

Logged out.

then log in with:

tailscale up

If it reports you're already connected, you'll see your assigned Tailscale IP and hostname.

If you want to switch accounts

From the menu bar app:

Click the Tailscale icon.
Go to Preferences or Settings.
Choose Log out.
Then Log in again with the desired account.

Or from Terminal:

tailscale logout
tailscale up

If you're not sure which version you're using, tell me the output of:

which tailscale
tailscale version

# How to secure http using tailscale? 

sandarbh@18mm frontend % tailscale serve --bg http://127.0.0.1:3000

Serve is not enabled on your tailnet.
To enable, visit:

         https://login.tailscale.com/f/serve?node=nazmi8acr111CNTRL

Success.
Available within your tailnet:

https://18mm.tail146023.ts.net/
|-- proxy http://127.0.0.1:3000

Serve started and running in the background.
To disable the proxy, run: tailscale serve --https=443 off
sandarbh@18mm frontend %