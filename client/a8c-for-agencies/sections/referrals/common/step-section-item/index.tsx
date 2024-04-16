import { Button } from '@automattic/components';
import { Icon } from '@wordpress/icons';
import React from 'react';

import './style.scss';

const ICON_SIZE = 24;

interface StepSectionItemProps {
	icon: JSX.Element;
	heading: string;
	description: string;
	buttonProps: React.ComponentProps< typeof Button >;
}

export default function StepSectionItem( {
	icon,
	heading,
	description,
	buttonProps,
}: StepSectionItemProps ) {
	return (
		<div className="step-section-item">
			<div className="step-section-item__icon">
				<Icon
					className="sidebar__menu-icon"
					style={ { fill: 'currentcolor' } }
					icon={ icon }
					size={ ICON_SIZE }
				/>
			</div>
			<div className="step-section-item__content">
				<div className="step-section-item__heading">{ heading }</div>
				<div className="step-section-item__description">{ description }</div>
			</div>
			<div className="step-section-item__button">
				<Button { ...buttonProps } />
			</div>
		</div>
	);
}
