
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from 'react-i18next';

interface FaqItem {
  question: string;
  answer: string;
}

interface Faq1Props {
  heading?: string;
  items?: FaqItem[];
}

const Faq1 = ({
  heading,
  items,
}: Faq1Props) => {
  const { t } = useTranslation();

  const translatedItems = [
    {
      question: t('supportPage.faqs.questions.whatIsMysteryMaker.question'),
      answer: t('supportPage.faqs.questions.whatIsMysteryMaker.answer')
    },
    {
      question: t('supportPage.faqs.questions.creationProcess.question'),
      answer: t('supportPage.faqs.questions.creationProcess.answer')
    },
    {
      question: t('supportPage.faqs.questions.saveWork.question'),
      answer: t('supportPage.faqs.questions.saveWork.answer')
    },
    {
      question: t('supportPage.faqs.questions.replayable.question'),
      answer: t('supportPage.faqs.questions.replayable.answer')
    },
    {
      question: t('supportPage.faqs.questions.playerCount.question'),
      answer: t('supportPage.faqs.questions.playerCount.answer')
    },
    {
      question: t('supportPage.faqs.questions.whatIncluded.question'),
      answer: t('supportPage.faqs.questions.whatIncluded.answer')
    },
    {
      question: t('supportPage.faqs.questions.canIEdit.question'),
      answer: t('supportPage.faqs.questions.canIEdit.answer')
    },
    {
      question: t('supportPage.faqs.questions.gameDuration.question'),
      answer: t('supportPage.faqs.questions.gameDuration.answer')
    },
    {
      question: t('supportPage.faqs.questions.themedMysteries.question'),
      answer: t('supportPage.faqs.questions.themedMysteries.answer')
    },
    {
      question: t('supportPage.faqs.questions.gameDesignEngagement.question'),
      answer: t('supportPage.faqs.questions.gameDesignEngagement.answer')
    },
  ];

  const finalItems = items || translatedItems;
  const finalHeading = heading || t('supportPage.faqs.title');

  return (
    <section className="py-32">
      <div className="container mx-auto">
        <h1
          className="mb-4 text-3xl md:mb-11 md:text-5xl"
          style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-display)' }}
        >
          {finalHeading}
        </h1>

        <div>
          {finalItems.map((item, index) => (
            <React.Fragment key={index}>
              <Accordion type="single" collapsible>
                <AccordionItem value={`item-${index}`} className="border-none">
                  <AccordionTrigger
                    className="hover:no-underline text-left"
                    style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500, textTransform: 'none' }}
                  >
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent style={{ color: 'var(--color-cream-muted)', fontFamily: 'var(--font-body)', textAlign: 'left', textTransform: 'none' }}>
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              {index < finalItems.length - 1 && (
                <div style={{ height: '1px', backgroundColor: 'var(--color-cream-border)', margin: '4px 0' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Faq1 };
