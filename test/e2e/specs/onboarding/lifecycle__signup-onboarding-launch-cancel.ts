/**
 * @group calypso-release
 */

import {
	DataHelper,
	BrowserManager,
	DomainSearchComponent,
	LoginPage,
	UserSignupPage,
	SignupPickPlanPage,
	SiteSettingsPage,
	CartCheckoutPage,
	StartSiteFlow,
	SecretsManager,
	SignupDomainPage,
	MyHomePage,
	ComingSoonPage,
	NewSiteResponse,
	RestAPIClient,
	NewUserResponse,
	MyProfilePage,
	MeSidebarComponent,
	cancelPurchaseFlow,
	NoticeComponent,
	PurchasesPage,
} from '@automattic/calypso-e2e';
import { Page, Browser } from 'playwright';
import { apiCloseAccount, fixme_retry } from '../shared';

declare const browser: Browser;

/**
 * Checks the entire user lifecycle, from signup, onboarding, launch and plan cancellation.
 *
 * Keywords: Onboarding, Store Checkout, Coupon, Signup, Plan, Subscription, Cancel
 */
describe( 'Lifecyle: Signup, onboard, launch and cancel subscription', function () {
	const planName = 'Personal';
	const testUser = DataHelper.getNewTestUser( {
		usernamePrefix: 'ftmepersonal',
	} );

	let page: Page;
	let newUserDetails: NewUserResponse;
	let newSiteDetails: NewSiteResponse;

	beforeAll( async () => {
		page = await browser.newPage();
	} );

	// wpcalypso is currently using the goals-first onboarding flow, so this is
	// skipped for now. Check out the "Goals-first Signup" test below.
	describe.skip( 'Signup', function () {
		let cartCheckoutPage: CartCheckoutPage;
		let signupPickPlanPage: SignupPickPlanPage;
		let originalAmount: number;

		beforeAll( async function () {
			await BrowserManager.setStoreCookie( page, { currency: 'GBP' } );
		} );

		it( 'Navigate to Signup page', async function () {
			const loginPage = new LoginPage( page );
			await loginPage.visit();
			await loginPage.clickCreateNewAccount();
		} );

		it( 'Sign up as new user', async function () {
			const userSignupPage = new UserSignupPage( page );
			newUserDetails = await userSignupPage.signupSocialFirstWithEmail( testUser.email );
		} );

		it( 'Skip domain selection', async function () {
			const signupDomainPage = new SignupDomainPage( page );
			await signupDomainPage.searchForFooDomains();
			await signupDomainPage.skipDomainSelection();
		} );

		it( `Select WordPress.com ${ planName } plan`, async function () {
			signupPickPlanPage = new SignupPickPlanPage( page );
			newSiteDetails = await signupPickPlanPage.selectPlan( planName );
		} );

		it( 'See secure payment', async function () {
			cartCheckoutPage = new CartCheckoutPage( page );
			await cartCheckoutPage.validateCartItem( `WordPress.com ${ planName }` );
		} );

		it( 'Prices are shown in GBP', async function () {
			const cartAmount = ( await cartCheckoutPage.getCheckoutTotalAmount( {
				rawString: true,
			} ) ) as string;
			expect( cartAmount.startsWith( '£' ) ).toBe( true );
		} );

		it( 'Apply coupon', async function () {
			originalAmount = ( await cartCheckoutPage.getCheckoutTotalAmount() ) as number;
			await cartCheckoutPage.enterCouponCode( SecretsManager.secrets.testCouponCode );
		} );

		it( 'Apply coupon and validate purchase amount', async function () {
			const newAmount = ( await cartCheckoutPage.getCheckoutTotalAmount() ) as number;

			expect( newAmount ).toBeLessThan( originalAmount );
			const expectedAmount = originalAmount * 0.99;

			// Some currencies do not typically have decimal places.
			// eg. USD would commonly have 2 decimal places, e.g. 12.34.
			// In JPY or TWD there will be no decimal digits.
			// Drop decimals so that the result won't be affected by the currency variation.
			expect( newAmount ).toStrictEqual( expectedAmount );
		} );

		it( 'Enter billing and payment details', async function () {
			const paymentDetails = DataHelper.getTestPaymentDetails();
			await cartCheckoutPage.enterBillingDetails( paymentDetails );
			await cartCheckoutPage.enterPaymentDetails( paymentDetails );
		} );

		it( 'Make purchase', async function () {
			await cartCheckoutPage.purchase( { timeout: 90 * 1000 } );
		} );

		it( 'Skip upsell if present', async function () {
			const selector = 'button[data-e2e-button="decline"]';
			const locator = page.locator( selector );

			try {
				await locator.click( { timeout: 2 * 1000 } );
			} catch {
				// noop
			}
		} );
	} );

	// wpcalypso is currently using the goals-first onboarding flow, so this is
	// skipped for now. Check out the "Goals-first Signup" test below.
	describe.skip( 'Onboarding', function () {
		let startSiteFlow: StartSiteFlow;

		beforeAll( async function () {
			startSiteFlow = new StartSiteFlow( page );
		} );

		it( 'Land on goal selection step', async function () {
			page.waitForURL( /setup\/site-setup\/goals\?/, { timeout: 30 * 1000 } );
		} );

		it( 'Select "Sell services or digital goods" goal', async function () {
			await startSiteFlow.selectGoal( 'Sell services or digital goods' );
			await startSiteFlow.clickButton( 'Next' );
		} );
	} );

	// wpcalypso is currently using the goals-first onboarding flow, so this is
	// skipped for now. Check out the "Goals-first Signup" test below.
	describe.skip( 'Sell', function () {
		const themeName = 'Attar';
		let startSiteFlow: StartSiteFlow;

		beforeAll( async function () {
			startSiteFlow = new StartSiteFlow( page );
		} );

		it( 'Select theme', async function () {
			await startSiteFlow.selectTheme( themeName );
			await startSiteFlow.clickButton( 'Continue' );
		} );

		it( 'Land in Home dashboard', async function () {
			// dirty hack to wait for the launchpad to load.
			// Stepper has a quirk where it redirects twice. Playwright hooks to the first one and thinks it was aborted.
			await fixme_retry( () =>
				page.waitForURL(
					DataHelper.getCalypsoURL( `/home/${ newSiteDetails.blog_details.blogid }` ),
					{ timeout: 30 * 1000 }
				)
			);
		} );

		it( 'Site slug exists', async function () {
			expect( newSiteDetails.blog_details.site_slug ).toBeDefined();
		} );
	} );

	// The steps in this test don't match what happens on production, because only wpcalypso
	// is using the goals-first onboarding flow. Check out the "Signup" test above
	// for the steps that work on production.
	describe( 'Goals-first Signup', function () {
		let cartCheckoutPage: CartCheckoutPage;
		let signupPickPlanPage: SignupPickPlanPage;
		let startSiteFlow: StartSiteFlow;
		let originalAmount: number;
		const themeName = 'Attar';

		beforeAll( async function () {
			await BrowserManager.setStoreCookie( page, { currency: 'GBP' } );
		} );

		it( 'Navigate to Signup page', async function () {
			const loginPage = new LoginPage( page );
			await loginPage.visit();
			await loginPage.clickCreateNewAccount();
		} );

		it( 'Land on goal selection step', async function () {
			page.waitForURL( /setup\/onboarding\/goals/, { timeout: 30 * 1000 } );
		} );

		it( 'Select "Sell services or digital goods" goal', async function () {
			startSiteFlow = new StartSiteFlow( page );

			await startSiteFlow.selectGoal( 'Sell services or digital goods' );
			await startSiteFlow.clickButton( 'Next' );
		} );

		it( 'Select theme', async function () {
			await startSiteFlow.selectTheme( themeName );
			await startSiteFlow.clickButton( 'Continue' );
		} );

		it( 'Sign up as new user', async function () {
			const userSignupPage = new UserSignupPage( page );
			newUserDetails = await userSignupPage.signupSocialFirstWithEmail( testUser.email );
		} );

		it( 'Skip domain selection', async function () {
			const signupDomainPage = new SignupDomainPage( page );
			await signupDomainPage.searchForFooDomains();
			await signupDomainPage.skipDomainSelection();
		} );

		it( `Select WordPress.com ${ planName } plan`, async function () {
			signupPickPlanPage = new SignupPickPlanPage( page );
			newSiteDetails = await signupPickPlanPage.selectPlan( planName );
		} );

		it( 'See secure payment', async function () {
			cartCheckoutPage = new CartCheckoutPage( page );
			await cartCheckoutPage.validateCartItem( `WordPress.com ${ planName }` );
		} );

		it( 'Prices are shown in GBP', async function () {
			const cartAmount = ( await cartCheckoutPage.getCheckoutTotalAmount( {
				rawString: true,
			} ) ) as string;
			expect( cartAmount.startsWith( '£' ) ).toBe( true );
		} );

		it( 'Apply coupon', async function () {
			originalAmount = ( await cartCheckoutPage.getCheckoutTotalAmount() ) as number;
			await cartCheckoutPage.enterCouponCode( SecretsManager.secrets.testCouponCode );
		} );

		it( 'Apply coupon and validate purchase amount', async function () {
			const newAmount = ( await cartCheckoutPage.getCheckoutTotalAmount() ) as number;

			expect( newAmount ).toBeLessThan( originalAmount );
			const expectedAmount = originalAmount * 0.99;

			// Some currencies do not typically have decimal places.
			// eg. USD would commonly have 2 decimal places, e.g. 12.34.
			// In JPY or TWD there will be no decimal digits.
			// Drop decimals so that the result won't be affected by the currency variation.
			expect( newAmount ).toStrictEqual( expectedAmount );
		} );

		it( 'Enter billing and payment details', async function () {
			const paymentDetails = DataHelper.getTestPaymentDetails();
			await cartCheckoutPage.enterBillingDetails( paymentDetails );
			await cartCheckoutPage.enterPaymentDetails( paymentDetails );
		} );

		it( 'Make purchase', async function () {
			await cartCheckoutPage.purchase( { timeout: 90 * 1000 } );
		} );

		it( 'Skip upsell if present', async function () {
			const selector = 'button[data-e2e-button="decline"]';
			const locator = page.locator( selector );

			try {
				await locator.click( { timeout: 2 * 1000 } );
			} catch {
				// noop
			}
		} );

		it( 'Land in Home dashboard', async function () {
			// dirty hack to wait for the launchpad to load.
			// Stepper has a quirk where it redirects twice. Playwright hooks to the first one and thinks it was aborted.
			await fixme_retry( () =>
				page.waitForURL(
					DataHelper.getCalypsoURL( `/home/${ newSiteDetails.blog_details.blogid }` ),
					{ timeout: 30 * 1000 }
				)
			);
		} );

		it( 'Site slug exists', async function () {
			expect( newSiteDetails.blog_details.site_slug ).toBeDefined();
		} );
	} );

	describe( 'Launch site', function () {
		it( 'Verify site is not yet launched', async function () {
			const tmpPage = await browser.newPage();
			await tmpPage.goto( newSiteDetails.blog_details.url as string );

			// View site.
			const comingSoonPage = new ComingSoonPage( tmpPage );
			await comingSoonPage.validateComingSoonState();

			// Dispose the test page and context.
			await tmpPage.close();
		} );

		it( 'Start site launch', async function () {
			const siteSettingsPage = new SiteSettingsPage( page );
			await siteSettingsPage.visit( newSiteDetails.blog_details.site_slug );
			await siteSettingsPage.launchSite();
		} );

		it( 'Skip domain purchase', async function () {
			const domainSearchComponent = new DomainSearchComponent( page );
			await domainSearchComponent.search( newSiteDetails.blog_details.site_slug );
			await domainSearchComponent.clickButton( 'Skip Purchase' );
		} );

		it( 'Navigated to Home dashboard', async function () {
			const myHomePage = new MyHomePage( page );
			await myHomePage.validateTaskHeadingMessage( 'You launched your site!' );
		} );
	} );

	describe( 'Cancel and remove plan', function () {
		let noticeComponent: NoticeComponent;
		let purchasesPage: PurchasesPage;

		it( 'Navigate to Me > Purchases', async function () {
			const mePage = new MyProfilePage( page );
			await mePage.visit();

			const meSidebarComponent = new MeSidebarComponent( page );
			await meSidebarComponent.navigate( 'Purchases' );
		} );

		it( 'View details of purchased plan', async function () {
			purchasesPage = new PurchasesPage( page );

			await purchasesPage.clickOnPurchase(
				`WordPress.com ${ planName }`,
				newSiteDetails.blog_details.site_slug
			);
			await purchasesPage.purchaseAction( 'Cancel plan' );
		} );

		it( 'Cancel plan renewal', async function () {
			await cancelPurchaseFlow( page, {
				reason: 'Another reason…',
				customReasonText: 'E2E TEST CANCELLATION',
			} );

			noticeComponent = new NoticeComponent( page );
			await noticeComponent.noticeShown( 'You successfully canceled your purchase', {
				timeout: 30 * 1000,
			} );
		} );
	} );

	afterAll( async function () {
		if ( ! newUserDetails ) {
			return;
		}

		const restAPIClient = new RestAPIClient(
			{
				username: testUser.username,
				password: testUser.password,
			},
			newUserDetails.body.bearer_token
		);

		await apiCloseAccount( restAPIClient, {
			userID: newUserDetails.body.user_id,
			username: newUserDetails.body.username,
			email: testUser.email,
		} );
	} );
} );
