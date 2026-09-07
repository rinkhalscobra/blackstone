import { PublicDocument } from '@/components/public/PublicDocument';
import { useLanguage } from '@/contexts/LanguageContext';

const Privacy = () => {
  const { t } = useLanguage();
  const groups = [
    { title: 'introduction', text: 'introText', list: [] },
    {
      title: 'infoCollect',
      text: 'infoCollectText',
      list: ['infoList1', 'infoList2', 'infoList3', 'infoList4', 'infoList5'],
    },
    {
      title: 'howWeUse',
      text: 'howWeUseText',
      list: ['useList1', 'useList2', 'useList3', 'useList4', 'useList5'],
    },
    { title: 'dataSecurity', text: 'dataSecurityText', list: [] },
    { title: 'infoSharing', text: 'infoSharingText', list: ['shareList1', 'shareList2', 'shareList3'] },
    {
      title: 'yourRights',
      text: 'yourRightsText',
      list: ['rightsList1', 'rightsList2', 'rightsList3', 'rightsList4'],
    },
    { title: 'contactUs', text: 'contactUsText', list: [] },
  ];
  return (
    <PublicDocument
      title={t('privacy.title')}
      updated={t('privacy.lastUpdated')}
      sections={groups.map((group) => ({
        title: t(`privacy.${group.title}`),
        content: (
          <>
            <p>{t(`privacy.${group.text}`)}</p>
            {group.list.length > 0 && (
              <ul>
                {group.list.map((key) => (
                  <li key={key}>{t(`privacy.${key}`)}</li>
                ))}
              </ul>
            )}
          </>
        ),
      }))}
    />
  );
};
export default Privacy;
