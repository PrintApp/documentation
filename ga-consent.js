// Google Analytics 4 with Consent Mode v2 — mirrors the main site's setup
// (print-app-website/src/components/ConsentBanner.astro). Docs are on
// docs.print.app, a different origin than print.app, so the localStorage
// consent choice is per-site (each shows its own banner once); GA's _ga
// cookie lives on .print.app and is shared across both.
// EU/UK/CH visitors (timezone detection): denied until accepted via the banner.
// Everyone else: granted by default; opt-out available on the main site footer.
(function () {
	if (window.__paGaLoaded) return;
	window.__paGaLoaded = true;

	var GA_ID = 'G-DYVG68XEKY';

	window.dataLayer = window.dataLayer || [];
	function gtag() { dataLayer.push(arguments); }
	window.gtag = window.gtag || gtag;

	var stored = null;
	try { stored = localStorage.getItem('pa-consent'); } catch (e) {}

	var tz = '';
	try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
	// EU timezones outside the Europe/ prefix: Iceland, Spanish/Portuguese islands, Cyprus
	var needsConsent = /^Europe\//.test(tz) ||
		['Atlantic/Reykjavik', 'Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores', 'Asia/Nicosia'].indexOf(tz) !== -1;

	var analytics = stored || (needsConsent ? 'denied' : 'granted');
	if (!stored && navigator.globalPrivacyControl) analytics = 'denied';

	gtag('consent', 'default', {
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
		analytics_storage: analytics
	});
	gtag('js', new Date());
	gtag('config', GA_ID);

	var s = document.createElement('script');
	s.async = true;
	s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
	document.head.appendChild(s);

	if (!needsConsent || stored) return;

	var el = document.createElement('div');
	el.id = 'pa-consent';
	el.style.cssText = 'position:fixed;right:1rem;bottom:1rem;z-index:9999;width:300px;max-width:calc(100vw - 2rem);' +
		'background:#14180f;border:1px solid #3a4534;border-radius:10px;padding:14px 16px;' +
		'opacity:0;transform:translateY(12px);transition:opacity .3s ease,transform .3s ease;' +
		'font-size:12px;line-height:1.55;color:#c9d4c4;font-family:inherit;';
	el.innerHTML =
		'<p style="margin:0;">We use one analytics cookie to see what’s useful. No ads, no data sharing. ' +
		'<a href="https://print.app/company/privacy" style="color:#8f9c89;text-decoration:underline;">Privacy policy</a></p>' +
		'<div style="display:flex;gap:8px;margin-top:12px;">' +
		'<button type="button" id="pa-consent-accept" style="flex:1;height:30px;font-size:12px;border-radius:6px;cursor:pointer;background:#00ac13;color:#fff;border:none;">Accept</button>' +
		'<button type="button" id="pa-consent-decline" style="flex:1;height:30px;font-size:12px;border-radius:6px;cursor:pointer;background:transparent;color:#8f9c89;border:1px solid #3a4534;">No thanks</button>' +
		'</div>';

	function choose(value) {
		try { localStorage.setItem('pa-consent', value); } catch (e) {}
		window.gtag('consent', 'update', { analytics_storage: value });
		el.style.opacity = '0';
		el.style.transform = 'translateY(12px)';
		setTimeout(function () { el.remove(); }, 300);
	}

	setTimeout(function () {
		document.body.appendChild(el);
		el.querySelector('#pa-consent-accept').addEventListener('click', function () { choose('granted'); });
		el.querySelector('#pa-consent-decline').addEventListener('click', function () { choose('denied'); });
		setTimeout(function () {
			el.style.opacity = '1';
			el.style.transform = 'translateY(0)';
		}, 30);
	}, 1200);
})();
