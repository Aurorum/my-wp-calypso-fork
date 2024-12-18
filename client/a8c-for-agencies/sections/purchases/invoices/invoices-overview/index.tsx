import { useTranslate } from 'i18n-calypso';
import MobileSidebarNavigation from 'calypso/a8c-for-agencies/components/sidebar/mobile-sidebar-navigation';
import Layout from 'calypso/layout/multi-sites-dashboard';
import LayoutBody from 'calypso/layout/multi-sites-dashboard/body';
import LayoutHeader, {
	LayoutHeaderTitle as Title,
} from 'calypso/layout/multi-sites-dashboard/header';
import LayoutTop from 'calypso/layout/multi-sites-dashboard/top';
import InvoicesList from '../invoices-list';

import './style.scss';

export default function InvoicesOverview() {
	const translate = useTranslate();

	const title = translate( 'Invoices' );

	return (
		<Layout
			className="invoices-overview"
			title={ title }
			wide
			sidebarNavigation={ <MobileSidebarNavigation /> }
		>
			<LayoutTop>
				<LayoutHeader>
					<Title>{ title } </Title>
				</LayoutHeader>
			</LayoutTop>

			<LayoutBody>
				<InvoicesList />
			</LayoutBody>
		</Layout>
	);
}
