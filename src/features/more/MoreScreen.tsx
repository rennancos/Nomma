import { router, type Href } from 'expo-router';
import { Card, ListRow, Screen, type IconName } from '@/components/Layout';

const GROUPS: { title: string; icon: IconName; href: Href }[][] = [
  [
    { title: 'Gastos fixos e salário', icon: 'repeat-outline', href: '/recurring' },
    { title: 'Parcelamentos', icon: 'layers-outline', href: '/purchases' },
    { title: 'Cartões de crédito', icon: 'cards', href: '/cards' },
  ],
  [
    { title: 'Investimentos', icon: 'investments', href: '/investments' },
    { title: 'Metas', icon: 'flag-outline', href: '/goals' },
    { title: 'Orçamentos', icon: 'pie-chart-outline', href: '/budgets' },
  ],
  [
    { title: 'Contas', icon: 'wallet-outline', href: '/accounts' },
    { title: 'Categorias', icon: 'pricetags-outline', href: '/categories' },
    { title: 'Backup e exportação', icon: 'cloud-download-outline', href: '/backup' },
    { title: 'Configurações', icon: 'settings-outline', href: '/settings' },
  ],
];

export default function MoreScreen() {
  return (
    <Screen size="list">
      {GROUPS.map((group, i) => (
        <Card key={i}>
          {group.map((item) => (
            <ListRow key={item.title} icon={item.icon} title={item.title} onPress={() => router.push(item.href)} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}
