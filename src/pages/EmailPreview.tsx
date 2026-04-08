
const welcomeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
  </div>
  <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
    <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">Welcome, Jonathan!</h2>
    <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">Your account is ready. Here's what you can do now:</p>
    <div style="background: #000000; border-left: 4px solid #FF6B6B; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">&#10024; <strong>Create custom mysteries</strong> in minutes using AI</p>
      <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">&#127917; <strong>Choose any theme</strong> — from Victorian mansions to space stations</p>
      <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">&#128231; <strong>Send character assignments</strong> directly to your guests</p>
      <p style="margin: 0; color: #F5F0E8; font-size: 15px;">&#128229; <strong>Download everything you need</strong> — host guides, clue cards, and more</p>
    </div>
    <div style="text-align: center; margin: 35px 0;">
      <a href="#" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Create Your First Mystery</a>
    </div>
    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1); line-height: 1.6;">
      <strong style="color: rgba(245,240,232,0.7);">Pro tip:</strong> You can explore and create as many mystery drafts as you like. You only pay ($24.99) when you're ready to generate the complete party package with all materials.
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
    <a href="#" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
`;

const characterHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
  </div>
  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">Hi Sarah,</p>
    <p style="margin-bottom: 20px; color: rgba(245,240,232,0.7);">You've been assigned a character for <strong style="color: #F5F0E8;">The Speakeasy Murder</strong>!</p>
    <div style="background: #000000; border-left: 4px solid #FF6B6B; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h2 style="color: #FF6B6B; margin-top: 0; font-size: 22px;">Your Character: Scarlett Valentine</h2>
      <p style="margin-bottom: 0; color: rgba(245,240,232,0.7);">A glamorous jazz singer with a secret past and a motive that runs deeper than anyone suspects...</p>
    </div>
    <p style="margin-bottom: 25px; color: rgba(245,240,232,0.7);">Click the button below to view your complete character guide:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Character</a>
    </div>
    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">Tip:</strong> Save this email or bookmark the link so you can access your character anytime!
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
    <a href="#" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
`;

const hostGuideHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">HOST GUIDE</h1>
  </div>
  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">Your host guide for <strong>The Speakeasy Murder</strong> is ready!</p>
    <div style="background: #000000; border-left: 4px solid #FF6B6B; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: rgba(245,240,232,0.7);">Everything you need to prepare for your mystery party: game overview, timeline, materials list, and hosting tips.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Host Guide</a>
    </div>
    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">Tip:</strong> Bookmark this link so you can easily access it on your phone during the party!
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
    <a href="#" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
`;

const emails = [
  { label: "Welcome Email", html: welcomeHtml },
  { label: "Character Assignment Email", html: characterHtml },
  { label: "Host Guide Email", html: hostGuideHtml },
];

export default function EmailPreview() {
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ color: '#F5F0E8', fontFamily: "'Bowlby One', cursive", textAlign: 'center', marginBottom: '2rem', textTransform: 'uppercase' }}>
        Email Template Preview
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center' }}>
        {emails.map((email, i) => (
          <div key={i} style={{ width: '100%', maxWidth: '700px' }}>
            <h2 style={{ color: '#FF6B6B', fontFamily: 'Inter, sans-serif', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
              {email.label}
            </h2>
            <div
              style={{ border: '1px solid rgba(245,240,232,0.1)', borderRadius: '8px', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: email.html }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
