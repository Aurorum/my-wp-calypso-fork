import { LoadingPlaceholder } from '@automattic/components';
import { type OnboardSelect } from '@automattic/data-stores';
import { FREE_THEME } from '@automattic/design-picker';
import { PlanButton } from '@automattic/plans-grid-next';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { useTranslate } from 'i18n-calypso';
import { ONBOARD_STORE } from 'calypso/landing/stepper/stores';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import { getHidePlanPropsBasedOnThemeType } from '../utils/utils';
import { ButtonContainer, DialogContainer, Heading, Row } from './components';
import { PlanName, PlanDescription } from './components/plan-item';
import SuggestedPlanSection from './components/suggested-plan-section';
import { DomainPlanDialogProps, MODAL_VIEW_EVENT_NAME } from '.';

export const PaidPlanIsRequiredDialog = ( {
	paidDomainName,
	generatedWPComSubdomain,
	selectedThemeType,
	onFreePlanSelected,
	onPlanSelected,
}: DomainPlanDialogProps ) => {
	const translate = useTranslate();
	const [ isBusy, setIsBusy ] = useState( false );
	const isPaidTheme = selectedThemeType && selectedThemeType !== FREE_THEME;
	const hidePlanProps = getHidePlanPropsBasedOnThemeType( selectedThemeType || '' );
	const { setCreateWithBigSky } = useDispatch( ONBOARD_STORE );
	const createWithBigSky = useSelect( ( select: ( key: string ) => OnboardSelect ) => {
		const { getCreateWithBigSky } = select( ONBOARD_STORE );
		return getCreateWithBigSky();
	}, [] );

	const getUpsellTitle = () => {
		if ( isPaidTheme && paidDomainName ) {
			return translate( 'Custom domains and premium themes are only available with a paid plan' );
		}

		if ( isPaidTheme ) {
			return translate( 'Premium themes are only available with a paid plan' );
		}

		if ( createWithBigSky && paidDomainName ) {
			return translate( 'Domains and our AI Website Builder are only available with a paid plan' );
		}

		if ( createWithBigSky ) {
			return translate( 'Our AI Website Builder is only available with a paid plan' );
		}

		return translate( 'Custom domains are only available with a paid plan' );
	};

	const handleFreeDomainClick = () => {
		setIsBusy( true );
		onFreePlanSelected();

		if ( createWithBigSky ) {
			setCreateWithBigSky( false );
		}
	};

	useEffect( () => {
		recordTracksEvent( MODAL_VIEW_EVENT_NAME, {
			dialog_type: 'paid_plan_is_required',
		} );
	}, [] );

	return (
		<DialogContainer>
			<Heading id="plan-upsell-modal-title" shrinkMobileFont>
				{ getUpsellTitle() }
			</Heading>
			<ButtonContainer>
				<SuggestedPlanSection
					{ ...hidePlanProps }
					isBusy={ isBusy }
					onPlanSelected={ onPlanSelected }
				/>
				<Row>
					<div>
						<PlanName>{ translate( 'Free' ) }</PlanName>
						<PlanDescription>
							{ paidDomainName && generatedWPComSubdomain.isLoading && <LoadingPlaceholder /> }
							{ paidDomainName && generatedWPComSubdomain.result && (
								<div>{ generatedWPComSubdomain.result.domain_name }</div>
							) }
							{ translate( 'Switch to our free default theme' ) }
						</PlanDescription>
					</div>
					<PlanButton
						disabled={ generatedWPComSubdomain.isLoading || ! generatedWPComSubdomain.result }
						busy={ isBusy }
						onClick={ handleFreeDomainClick }
					>
						{ translate( 'Continue with Free' ) }
					</PlanButton>
				</Row>
			</ButtonContainer>
		</DialogContainer>
	);
};
