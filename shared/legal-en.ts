import type { LegalDocument, LegalPolicy, LegalSection } from "./legal";

// Complete, clause-aligned English translation of legal version 2026-10-09.
// Keep clause order and meaning aligned with the Indonesian source; never machine-translate at runtime.
function section(heading: string, ...paragraphs: string[]): LegalSection {
  return { heading, body: paragraphs.join("\n\n") };
}

const terms: LegalDocument = {
  title: "Slivadoc Terms and Conditions",
  introduction: "This document governs the relationship between users and PT Sliva Technology Indonesia when using Slivadoc. Read every section, including the terms for each service you choose. Numbered clauses provide clear references for rights, obligations, transactions, and complaint procedures. The Privacy Policy is a separate document that must also be read during registration.",
  sections: [
    section("Operator, scope, and contacting us",
      "Slivadoc is operated by PT Sliva Technology Indonesia, referred to in this document as Slivadoc or we. Users are referred to as you. These terms apply to the website, Pet Owner application, accounts, transaction facilities, community features, and supporting services provided through Slivadoc, wherever accessible within the available service areas.",
      "Services include pet profiles, pet families, the marketplace, care bookings, consultations, Pet Sitter, Pet Academy, Pet Event, PetSpot, PetHub, adoption, PAW Dating, Pet Documents, Petship, available fundraising features, and SlivaCare. Mentioning a feature does not guarantee its availability in every area, on every device, or at all times.",
      "Operational and transaction questions should be submitted through in-app Customer Support Chat. Personal data requests may be sent to privacy@slivadoc.com. Provide only the account details and relevant activity reference needed; never send passwords, OTPs, payment PINs, or bank account access to support staff."
    ),
    section("Definitions",
      "An account is an electronic identity used to access services. A Pet Parent or Pet Owner is a user who owns an animal or is lawfully authorised to care for it. A pet is an animal whose profile is managed through Slivadoc. Family access is a limited permission allowing another user to perform specific functions on a pet profile.",
      "Partners include listed shops, clinics, veterinarians, trainers, groomers, boarding providers, sitters, event organisers, venue operators, and other service providers. Orders, bookings, applications, and registrations are different transactions or activities, each with its own status, requirements, fees, and completion times.",
      "User content includes text, reviews, photos, videos, messages, attachments, and information submitted by users. Transaction information includes the displayed goods or services, prices, charges, timing, cancellation policies, and confirmations. Calendar days differ from business days; deadlines expressed in business days follow the explanation in the relevant service terms or applicable rules."
    ),
    section("Related documents and protection of user rights",
      "Read these terms together with the Privacy Policy, transaction details, and specific conditions communicated before you agree to a service. Specific conditions may describe scheduling, pet needs, cancellations, or delivery, but must not reduce rights protected by legislation.",
      "Mandatory legal provisions take priority if there is a conflict. The transaction details you specifically accepted then apply to that transaction, insofar as lawful. The Privacy Policy governs data processing, while this document governs use and service relationships; neither replaces the other.",
      "No provision is intended to transfer all business liability, deny legally required refunds or compensation, impose prohibited burdens of proof, or require acceptance of unilateral changes contrary to Article 18 of the Consumer Protection Law. An unlawful clause does not become enforceable merely because a checkbox has been selected."
    ),
    section("Indonesian legal framework",
      "Use of the services is subject to Indonesian law, including Law No. 11 of 2008 on Electronic Information and Transactions, as amended by Law No. 19 of 2016 and Law No. 1 of 2024; Law No. 27 of 2022 on Personal Data Protection; Government Regulations No. 71 of 2019 and No. 80 of 2019; and Law No. 8 of 1999 on Consumer Protection.",
      "Intellectual property provisions refer, among other legislation, to Law No. 28 of 2014 on Copyright. Animal services also follow relevant livestock, animal health and welfare, quarantine, conservation, and local or destination rules. Rules on protecting children in electronic systems also apply to children's access insofar as relevant to the service.",
      "References to the Electronic Information and Transactions Law (UU ITE) concern system operation, transactions, electronic evidence, security, and lawful use. Listing legislation does not mean Slivadoc holds every particular licence, certificate, or regulatory approval. A partner's or service's authorisation must be assessed using the documents actually applicable to that activity."
    ),
    section("Legal capacity, representation, and use by children",
      "Accounts and transactions must be managed by people with capacity to enter into agreements under applicable law. If acting for a business, organisation, family, or another animal owner, you must have demonstrable authority and must not bind someone who has not authorised you.",
      "Pet Owner registration is intended for users who can lawfully manage an account and provide agreement. Children and people needing assistance must not bypass restrictions by entering false identities. An authorised parent, guardian, or assistant manages bookings and necessary information through an appropriate account.",
      "Slivadoc may request clarification of capacity or authority where needed for particular transactions, with due regard to data minimisation. A guardian's consent does not automatically make every feature available to a child; age limits, service restrictions, and risk assessments under child protection rules still apply."
    ),
    section("Electronic agreement and evidence of acceptance",
      "Before registering, you must separately open the Terms and Conditions and Privacy Policy, scroll through each document to the end, and press I have read and agree. The corresponding checkbox is selected only after this action. Closing a document, visiting a page, or remaining silent does not constitute agreement.",
      "Slivadoc records the document version and acceptance time associated with your account. These records support evidence of acceptance but do not remove requirements for a valid agreement or your right to challenge mistakes and account misuse. Electronic contracts follow the principles of agreement, capacity, a defined subject matter, and a lawful purpose under Government Regulation No. 71 of 2019.",
      "Accepting the terms does not grant unlimited authority for future transactions. Payments, animal handovers, home access, content publication, medical procedures, and additional processing requiring specific consent remain subject to the relevant service confirmations. Accepting the Privacy Policy does not automatically constitute marketing consent."
    ),
    section("Registration, verification, and accurate account information",
      "Registration requires your full name, an email address you control, a valid phone number, a password, and acceptance of both documents. Enter the phone number in the requested numeric format. Email verification by OTP must be completed for activation as shown in the application.",
      "You must use accurate identity and contact information, update changes, and not register someone else's contact details without authority. Slivadoc may reject invalid formats, existing registered emails, excessive repeated requests, or registrations indicating system abuse.",
      "Email verification establishes control of the email address at the time of verification; it does not certify your entire identity, animal ownership, ability to pay, or professional qualifications. If you lose access to your contact details, use official support and follow proportionate recovery checks."
    ),
    section("Passwords, OTPs, devices, and account security",
      "Use a password meeting the form's security rules, which is difficult to guess and not shared with anyone. Passwords are stored as hashes. Changing a password through your account requires checking the old password, entering a new one, and providing a matching confirmation.",
      "Do not disclose OTPs, session tokens, recovery links, or confidential payment information to anyone claiming to represent Slivadoc. Log out of shared devices, check unfamiliar activity, and report suspected account takeovers. You may need to sign in again if a session expires, is revoked, or requires security checks.",
      "Account activity can indicate a user's actions, but is not conclusive proof that the owner performed every action. Slivadoc will assess unauthorised-access reports and relevant records. Your duty to protect your account does not remove Slivadoc's responsibility for systems under its control."
    ),
    section("Pet profiles, ownership, and family access",
      "Pet profiles must contain accurate information to the extent known, including species, identity, special needs, health conditions, and other information relevant to the service. You must own the pet or be authorised to manage it. A digital profile is not, by itself, an ownership certificate binding third parties.",
      "When inviting a co-parent, caregiver, veterinarian, or family member, select roles and permissions as needed. Recipients may use information only within their authority. You are responsible for checking recipients before inviting them and revoking access when the relationship or authority ends.",
      "Revocation prevents subsequent access through the system's functions but does not retrieve copies already lawfully obtained. Ownership, care, or authority disputes must be resolved with appropriate evidence. Slivadoc may restrict disputed changes to prevent misuse during a review."
    ),
    section("Slivadoc's role and partner responsibilities",
      "Slivadoc provides tools for finding services, communicating, managing activities, and recording transactions according to the feature. The seller or service provider is identified on the service or transaction page. Partners are responsible for their offers, competence, required licences, and performance of their obligations.",
      "Verification labels, online status, ratings, photos, and activity history describe particular information available in the system; they are not unlimited guarantees of character, care outcomes, safety, or availability. Check the service scope and your pet's needs before selecting a provider.",
      "Slivadoc remains responsible for its own obligations as a service operator and does not use partner relationships to eliminate consumer rights. For issues involving multiple parties, users may request support coordination; responsibility is assessed according to roles, evidence, agreements, and the law."
    ),
    section("Offers, prices, and availability",
      "Before agreeing to a transaction, check the provider, goods or services, specifications, selected pet, service area, schedule, quantity, prices, taxes, administration charges, delivery, discounts, and total. Read images and illustrations alongside written descriptions, particularly sizes, variants, package contents, and service limits.",
      "Stock, appointments, capacity, and online status can change. Items in a basket, messages to a partner, or a displayed schedule do not necessarily reserve stock or a slot. A booking is established by the relevant confirmation status, not simply the initial display or an outdated notification.",
      "For a material price or description error, Slivadoc or the partner must explain it before requesting your agreement to a change. Extra charges must not be imposed without notice. If the transaction cannot be fulfilled as agreed, resolution may involve a newly accepted offer, cancellation, or a refund according to applicable rights."
    ),
    section("Placing orders and activity statuses",
      "Review the summary before pressing the order or payment button. Ensure the address, recipient contact, pet, schedule, special needs, attachments, and payment method are correct. Corrections after confirmation depend on processing stage and provider capabilities, without removing the right to correction of system errors.",
      "Statuses such as awaiting payment, confirmed, processing, revision required, completed, cancelled, and rejected have meanings specific to the service. A successfully submitted form does not automatically mean payment succeeded, a partner accepted a booking, a document was issued, or a service was completed.",
      "Use the displayed order or activity number when communicating. Avoid submitting duplicate orders on a slow connection; check the history first. Report duplicates or inconsistent statuses with the relevant references so they can be reconciled against server and payment-provider records."
    ),
    section("Payments, confirmation, invoices, and refunds",
      "Pay only through the official methods and destinations displayed for the transaction. Check the amount and instruction expiry before paying. Transfer receipts or screenshots assist investigation, but payment confirmation depends on reconciliation with the payment provider and transaction records.",
      "Invoices may cover shop products, clinic services, or a combination according to recorded transactions. Invoices and payment receipts serve different purposes. Incorrect names, charges, settlement, refunds, or duplicate invoices may be submitted for review; changes follow the issuer's authority and recordkeeping requirements.",
      "Approved refunds are processed through an appropriate method, with available information on the amount, reason, and progress. Receipt timing can depend on the payment provider. Users must not be asked to provide bank PINs or OTPs to receive refunds; account verification may use only necessary information.",
      "Disputed payments and suspected unauthorised transactions should be handled through support and the payment provider with relevant evidence. Holds or adjustments require a clear basis and must not automatically be used to deny all consumer rights."
    ),
    section("Promotions, vouchers, points, and membership",
      "Promotions follow the conditions shown before use, such as period, quota, minimum spend, eligible products, area, usage limits, and combination rules. Check the total after applying a voucher. The word free does not remove other charges that are clearly disclosed and accepted by you.",
      "Points and membership tiers are programme benefits governed by published rules, not deposits, electronic money, or investments unless expressly stated for a product with the relevant legal basis. Points are not automatically redeemable for cash or transferable, and points from cancelled transactions may be reasonably adjusted.",
      "False accounts, fabricated transactions, use of another person's identity, or referral manipulation may lead to related benefits being frozen during review. Corrections must consider evidence and users' right to explanations. Programme changes must not arbitrarily cancel transaction rights already lawfully acquired."
    ),
    section("Marketplace goods and restricted products",
      "Sellers must accurately state product names, condition, sizes, composition or materials, expiry where relevant, instructions, and limitations. Buyers must choose products suitable for an animal's species, age, size, allergies, and needs, and follow reliable instructions for use.",
      "Counterfeits, proceeds of crime, expired products presented as fit for use, unlicensed hazardous materials, and legally prohibited goods must not be offered. Medicines or services requiring prescriptions, examinations, or professional authority do not become unrestricted merely because they appear in the marketplace.",
      "Slivadoc may request more information or restrict risky offers. If you suspect a product is unsafe, stop using it when necessary, retain packaging and transaction evidence, and report it to support or the partner. Contact a veterinarian for animal health reactions without waiting for a commercial complaint to be resolved."
    ),
    section("Delivery, receipt, and failed handovers",
      "Addresses, postal codes, recipient contacts, map locations, and access directions must be sufficiently clear for delivery. Estimated times are not absolute date commitments unless specifically guaranteed in the offer. Area restrictions, goods type, weather, site access, and delivery-provider processes can affect performance.",
      "On receipt, reasonably check quantities, external condition, and conformity with the order. Photos or videos may support evidence but must not become the sole condition that removes consumer rights for defective or incorrect goods. Report issues with the order number and a verifiable description.",
      "For incorrect addresses, unreachable recipients, unexplained refusals, loss, or transit damage, responsibility and charges are reviewed according to causes and previously disclosed rules. Lawful redelivery charges must be explained before being applied. Do not send live animals through goods-delivery services that prohibit them."
    ),
    section("Product complaints, returns, warranties, and nonconformity",
      "Incorrectly delivered, damaged, latently defective, or misdescribed goods and services that fail to meet the agreement may be submitted for review. Include transaction details, the issue, when it became known, and available evidence. Do not discard goods or packaging still needed for inspection, provided they are safe to keep.",
      "Remedies may include repair, replacement, completion of missing items or work, an agreed price reduction, refund, or legally appropriate compensation. Manufacturer warranties and hygiene restrictions for particular products must not remove rights concerning defects or seller errors.",
      "Claim periods, return conditions, return addresses, and allocation of shipping costs must be clearly explained and comply with consumer protection and applicable electronic commerce rules. If a complaint button is no longer available, you may still contact support; an interface limit does not itself extinguish legal rights."
    ),
    section("Bookings, scheduling, delays, and cancellation",
      "Bookings depend on partner availability, location, duration, pets, health requirements, and disclosed special needs. Request rescheduling as early as possible. A new schedule takes effect when confirmed; sending a message or selecting an alternative date does not necessarily change an existing booking.",
      "Cancellation terms and fees, no-shows, delays, and deposits must be displayed before confirmation. Charges may be imposed only insofar as lawful, reasonable, and consistent with accepted information. Emergencies, system errors, and a partner's inability to perform must be assessed on their individual facts.",
      "If a partner cancels or fails to attend, users are entitled to an explanation and appropriate options, including rescheduling or refunds for services not received. Material changes to the provider, package, location, or total require your agreement and are not deemed accepted merely because you did not immediately respond."
    ),
    section("Clinics, veterinarians, consultations, and medical decisions",
      "Veterinarian and clinic profiles help users choose providers, but users should consider the service type and required authority. Diagnoses, prescriptions, procedures, examinations, and clinical decisions may be provided only by authorised parties under professional and animal-health regulations.",
      "Text, voice, or video consultations have limitations because the veterinarian may be unable to physically examine the animal. Honestly describe symptoms, history, medicines, allergies, and changes. The veterinarian may recommend an in-person examination, additional tests, or referral; treatment success cannot be guaranteed through an app conversation alone.",
      "Agreement to the application is not agreement to every medical procedure. Procedures, risks, charges, and medicines require explanation and consent appropriate to the service. For breathing difficulties, seizures, severe injuries, poisoning, or other emergencies, contact a veterinary facility immediately; do not wait for a chat response or Slivadoc administration."
    ),
    section("SlivaCare, AI assistance, and educational information",
      "SlivaCare may use artificial intelligence models to answer questions and help explain general information. Answers may be incomplete, incorrect, outdated, or unsuitable for a particular pet. They do not constitute an examination, definitive diagnosis, prescription, or guarantee of a health outcome.",
      "Check important information with a veterinarian or reliable source before taking steps affecting safety, medication, dosage, or care. Do not enter passwords, OTPs, card numbers, human identity data, or unnecessary third-party documents into AI conversations.",
      "Messages sent to AI features involve processing relevant context as described in the Privacy Policy. You remain responsible for assessing whether an answer is suitable to use, while Slivadoc retains obligations concerning service design, explaining limitations, and processing within its control."
    ),
    section("Grooming, boarding, training, and nonmedical care",
      "Before care begins, disclose skin conditions, wounds, parasites, allergies, fears, aggressive behaviour, relevant vaccinations, medicines, and feeding habits. Partners must explain admission requirements and facilities. Pets presenting infection risks or needs beyond a facility's capabilities may require prior assessment or referral.",
      "Grooming, boarding, or training follows the agreed package. Very short clipping, method changes, extra time, special products, or material extra charges must be explained. Medical procedures and sedation are not included in general agreement to grooming or boarding.",
      "Record drop-off and collection times, belongings, food, medication instructions, and emergency contacts. For injury, a missing animal, suspected abuse, or deteriorating health, prioritise safety, contact the relevant parties, and preserve a chronology. Responsibility is assessed according to events and each party's obligations."
    ),
    section("Pet Sitter, home access, and care instructions",
      "Pet Sitter bookings must describe daily or weekly service, dates, visit times, pets, location, feeding, cleaning, activities, and emergency contacts. Changes to the number of pets, duration, or work outside the agreement require discussion and prior confirmation of charges.",
      "For home visits, owners provide only necessary access and explain permitted areas. Arrange safe key handover and return. Share door or alarm codes narrowly and change them when needed. Sitters must not bring other people, use personal belongings, or record rooms beyond the relevant permission.",
      "Medication instructions must come from an authorised party and clearly state the name, dose, timing, and conditions of administration. Sitters may refuse tasks requiring medical competence or presenting danger. Agreement to a sitter is not permission for invasive veterinary procedures or independently changing treatment.",
      "Visit reports, photos, condition updates, and completion assessments support care communication. Photos must not reveal residents' identities, full addresses, or irrelevant personal belongings. In emergencies, follow the agreed plan and contact the owner or alternative contact; decisions on expenses and procedures must still respect safety and each party's authority."
    ),
    section("Pet Academy and learning materials",
      "Classes and programmes follow the displayed content, organiser, ability level, method, schedule, language, and access period. Educational information does not replace individual assessment by a competent veterinarian or trainer. Each animal's needs and learning pace differ.",
      "Paid materials are for personal use within the purchased package. Do not share credentials, record or resell material without permission, remove copyright notices, or claim ownership. Materials offered for download remain subject to the disclosed licence limits.",
      "Read attendance, rescheduling, assignment, participation-certificate, and cancellation conditions before registering. Participation certificates do not automatically confer a practice licence, professional recognition, or guaranteed competence. If a class is unavailable as agreed, users may request fulfilment, replacement, or an appropriate payment resolution."
    ),
    section("Pet Event, tickets, and event safety",
      "Tickets follow the participant category, number of people and pets, capacity, venue, time, and organiser's rules. Enter participant names, pet identities, and health requirements accurately. Owner-only tickets do not automatically allow pets where an event has different categories or restrictions.",
      "Follow leash, carrier, hygiene, supervision, vaccination where required, and animal-separation rules. Organisers may restrict participation for objective, disclosed safety reasons. Users must supervise their pets and respect other participants; organisers remain responsible for their event-safety obligations.",
      "Ticket-transfer, late-arrival, cancellation, venue-change, refund, and event-documentation conditions must be communicated. Attendance does not automatically grant unlimited permission to use facial images or identities in advertising. Documentation requiring specific consent must be addressed separately from acceptance of registration terms."
    ),
    section("PetSpot, Petship, locations, and public facilities",
      "Information on pet-friendly places, facilities, reservations, assistance points, or location reports helps with planning. Opening hours, access, prices, animal policies, and site conditions can change. Confirm important needs with the operator, especially for pets with special requirements.",
      "Reservations follow displayed capacity, areas, time windows, guest and pet numbers, deposits, and venue rules. Do not enter private property, disturb wildlife, damage facilities, or leave litter. Maps and routes do not guarantee that every path is safe or accessible.",
      "When reporting or updating locations, avoid disclosing home addresses, residents' contacts, or animal locations that could be misused. Do not submit false reports. User information may be moderated or corrected, and assistance or animal-ownership claims still require appropriate checks."
    ),
    section("PetHub, video, broadcasts, and media access",
      "PetHub and related media may provide recordings, live streams, or visual information according to available services. Access depends on user rights, provider permission, schedules, networks, and device functions. A disrupted stream does not itself establish an animal's physical condition or a location's circumstances.",
      "Users must not redistribute restricted streams, unlawfully record others, broadcast private spaces without permission, or use content for harassment. Facility owners must explain cameras and usage limits to relevant parties before the service takes place.",
      "An active call or broadcast does not mean Slivadoc records every communication. Where recording is provided, its purpose, authorised recipients, and storage terms must be explained in the service context. Device camera or microphone permissions can be withdrawn, which may prevent related features from working."
    ),
    section("Adoption, adopter assessment, and handover",
      "An adoption application is a request for assessment by the owner, shelter, or organiser, not an automatic right to receive an animal. Honestly describe your residence, experience, care capacity, and reasons for adopting. Anyone offering an animal must have authority and disclose known conditions.",
      "Before handover, agree on the animal's identity, health history, any lawful fees, documents, transport, responsibilities, and follow-up arrangements. Fees must not disguise prohibited animal trading. App approval does not replace required custody or ownership-transfer documentation.",
      "Violence, neglect, false adoption claims, exploitation, and resale contrary to law or agreement are prohibited. Report welfare concerns using safe, relevant evidence. Slivadoc cannot guarantee every third-party statement but can assist with reports within its authority."
    ),
    section("PAW Dating and pet meetings",
      "PAW Dating helps discover pet profiles or interactions through its available features. An app match does not guarantee behavioural, health, or genetic compatibility, or successful breeding. Users must have authority over their pets and must not use the feature for harmful activities.",
      "Before meeting, discuss health, vaccinations, behaviour, size, and supervision. Choose a safe location, use suitable restraints, and stop interactions if animals show stress or aggression. Do not disclose private addresses, identity data, or payments to parties whose trustworthiness has not been established.",
      "Breeding decisions require consideration of welfare, medical suitability, and applicable rules. Slivadoc does not guarantee fertility, offspring, or financial outcomes. Agreements between owners must be lawful and cannot override animal-protection duties."
    ),
    section("Pet Documents, file authenticity, and issuing authority",
      "Pet Documents facilitates applications and submission of requirements for the selected service. Complete pet, owner, travel where needed, and all requested attachment details. Files must be readable, accurate, relevant, unaltered, and lawfully submitted by you.",
      "PDF, JPG, or PNG uploads follow the app's size limits. A successful upload does not mean the application has been accepted or an official document issued. Revisions may be requested for incomplete, inconsistent, expired, or otherwise reviewable information; monitor status and staff notes.",
      "Veterinary and quarantine certificates or documents remain subject to the authority of the lawful issuer for that document type. Application receipts or platform-created profile documents do not replace government permits. Service fees do not guarantee approval, examination results, authority processing times, or acceptance at the destination.",
      "For animal movements, users must check quarantine, health, airline, port, and destination-country or regional requirements. Do not upload forged documents, alter examination results, or use another pet's identity. Applications that cannot proceed are resolved according to service stage, lawfully incurred costs, and applicable consumer rights."
    ),
    section("Community, reviews, messages, and user reports",
      "Communicate honestly and respectfully. Reviews should reflect relevant experience, not be purchased or fabricated, and must not include other people's personal data. Lawful negative opinions, criticism, and complaints are not automatically violations merely because they harm a provider's image.",
      "Spam, fraud, impersonation, doxing, threats, extortion, harassment, unlawful discrimination, and exploitative or violent content are prohibited. Do not ask users to send OTPs, credentials, or payments to unofficial destinations through shop chats or community messages.",
      "Use reporting or support channels to request review. Include relevant links, content identifiers, event times, and reasons. Slivadoc may restrict content during review according to risk, preserve proportionate evidence, and respond to lawful authority requests without assuming every report is true."
    ),
    section("Fundraising, donations, and beneficiary information",
      "Where assistance or fundraising is available, campaign organisers must explain purposes, beneficiaries, targets, spending plans, charges, and reporting. Users should read campaign details before contributing and must not assume Slivadoc directly organises every campaign.",
      "Campaigns must be authorised and meet applicable permits or legal requirements. False stories, photos, diagnoses, or animal and owner identities are prohibited. Share beneficiary information only as needed, respecting dignity, privacy, and the relevant people's rights.",
      "Disbursement, purpose changes, discontinued campaigns, suspected misuse, and refunds follow lawful information and review outcomes. Contributions are not investments and promise no profit. Tax-deduction or special-treatment claims apply only when supported by appropriate rules and evidence."
    ),
    section("Content rights and intellectual property",
      "Slivadoc's and its licensors' brands, designs, software, text, educational materials, and assets are protected by law. You receive a limited right to lawfully access the services, not to resell, impersonate, remove attribution, or distribute paid materials without permission.",
      "You retain rights to your own content. Uploading grants a non-exclusive permission only as needed to store, process, display, deliver, and technically reformat it to operate the features you choose. This permission follows your visibility choices and does not automatically allow faces, brands, or private documents to be used in advertising outside the service context.",
      "Ensure you have permission for other parties' photos, music, videos, documents, and information. Infringement reports should identify the protected work or right, disputed content, reporter's authority, and contact details. Removal and responses from the reported party are handled according to evidence and applicable law."
    ),
    section("System security and prohibited use under UU ITE",
      "Unauthorised account or system access, credential theft or trading, alteration of others' data, unlawful interception, malware, service disruption, and exploiting vulnerabilities for gain are prohibited. Security testing beyond ordinary use requires clear authorisation.",
      "Do not manipulate identities, electronic documents, payment statuses, stock, bookings, referrals, or service outcomes to deceive. Bulk extraction and automation that breach access controls, overload systems, or disclose personal data are also prohibited. Official integrations remain subject to their permissions and limits.",
      "Report suspected vulnerabilities through support without disclosing discovered personal data. Stop after obtaining minimum evidence, do not copy databases, and do not threaten disclosure to force a reward. Findings of unlawful conduct and sanctions belong to competent authorities, not unilateral platform decisions based on an UU ITE label."
    ),
    section("Data processing when providing services",
      "Data is processed under the Privacy Policy for account creation, service provision, transactions, security, and legal duties. Partners receive information relevant to services you choose. Accepting this document does not authorise Slivadoc or partners to use all data for unrelated purposes.",
      "If you enter family members', recipients', emergency contacts', sitters', or other people's data, you must have a lawful basis for sharing it and provide necessary information to those people. Do not upload human identity or sensitive data that the service does not request.",
      "Profile changes, family access, withdrawal of device permissions, copy requests, processing restrictions, and deletion have different effects. Users may request explanations through the privacy contact. Exercising data rights must not be made conditional on buying services or accepting extra marketing."
    ),
    section("Fraud prevention, moderation, and opportunities to object",
      "To protect users and animals, Slivadoc may examine signs of fake accounts, fabricated transactions, unlawful attachments, spam, safety threats, or promotional abuse. Reviews may use activity records, reports, additional checks, and communication with relevant parties on a lawful processing basis.",
      "Actions may include clarification requests, restrictions on particular features, process delays, content removal, cancellation of unlawful activities, or access termination. Actions must be proportionate to risks and evidence. In urgent cases or where law prohibits disclosure, restrictions may precede a full explanation.",
      "You may object through support with activity references, a chronology, and relevant evidence. Reviews must consider misidentification and context. Lawful reports or criticism must not lead to retaliation, and internal processes do not remove the right to contact authorities or dispute-resolution bodies."
    ),
    section("Account termination, ongoing transactions, and remaining obligations",
      "You may stop using the service and request account deletion through Privacy & security. The deletion flow uses OTP verification and a 14-day grace period to cancel the request before deletion proceeds. Other personal data rights remain subject to the Privacy Policy and statutory deadlines.",
      "Before closing an account, check bookings, outstanding obligations, shipments, document applications, refunds, and family access. Closure does not itself cancel valid contracts, erase receivables, or release partners from outstanding service and refund duties.",
      "If Slivadoc terminates access, resolution of lawful activities, refunds owed, and data requests must remain available through appropriate channels. Limited records may be retained for legal duties or disputes. Liability, transaction evidence, confidentiality, and dispute-resolution provisions continue insofar as needed."
    ),
    section("Service availability, maintenance, and technical errors",
      "Services depend on devices, connectivity, Slivadoc systems, and supporting providers. Maintenance, updates, capacity limits, and third-party outages may affect access. Users should use supported app versions and keep retrievable references for important transactions.",
      "If a button or status does not respond, do not immediately repeat payments several times. Check activity, connectivity, and notifications; contact support if the status remains unclear. Device times may differ from server records, so investigations rely on relevant transaction records.",
      "Slivadoc must address disruptions within its control according to applicable standards and legal obligations. Acknowledging possible outages does not remove rights to correction, information, or remedies for losses for which the operator is responsible. This digital service is not an emergency channel guaranteeing an immediate response."
    ),
    section("Liability, risks, and legally permitted limits",
      "Each party is responsible for its obligations, acts, or omissions under agreement and law. Users must provide truthful information and follow reasonable safety instructions; partners must perform within their authority and offers; Slivadoc must fulfil its operator duties.",
      "Care, health, training, adoption, animal interactions, and third-party performance cannot be absolutely guaranteed. However, the absence of an outcome guarantee is not an exemption for fraud, intentional misconduct, negligence, data breaches, or nonconforming services giving rise to legal liability.",
      "This document does not eliminate all liability, unilaterally cap compensation, or waive mandatory consumer rights. Claims are assessed through causation, demonstrable loss, allocation of roles, and valid decisions or agreements. All parties are still expected to take reasonable steps to limit losses."
    ),
    section("Force majeure and extraordinary obstacles",
      "Natural disasters, major fires, directly affecting epidemics, official restrictions, widespread infrastructure failures, and other reasonably unavoidable events beyond control may affect performance. An event is not automatically force majeure merely because it increases costs or inconveniences a party.",
      "The affected party should provide appropriate information, explain affected obligations, and seek recovery or reasonable alternatives. Pet safety, goods storage, user communication, and payment handling must continue to receive attention appropriate to the circumstances.",
      "Rescheduling, termination, or refunds for unfulfilled services should be discussed according to actual effects and law. Force majeure does not automatically erase lawfully accrued payment obligations, liability for earlier negligence, or all rights to funds not yet used for services."
    ),
    section("Complaints, evidence, and dispute resolution",
      "Submit complaints through Customer Support Chat with the account name or email, transaction reference, a brief chronology, event time, and requested resolution. Include relevant evidence safe to share. Personal data complaints may be sent directly to privacy@slivadoc.com without disclosing details to uninvolved parties.",
      "Slivadoc may seek clarification, contact partners, inspect logs and payment evidence, and provide updates based on findings. You may correct information or submit more evidence. Electronic information may serve as evidence under UU ITE, while authenticity, integrity, relevance, and parties' rights to challenge it remain relevant.",
      "Amicable resolution is sought without forcing users to waive legal rights. If unresolved, consumers may still use the Consumer Dispute Settlement Agency (BPSK), competent courts, supervisory authorities, or other lawful mechanisms. This document imposes no exclusive arbitration or foreign forum requirement."
    ),
    section("Notices, amendments, and versions",
      "Service notices may be delivered through the app or relevant registered contacts. Keep these contacts accessible. Promotions are distinguished from necessary transaction, security, or contract-change notices. Declining marketing does not automatically stop essential messages about services you are using.",
      "Material changes are notified with adequate explanations and effective dates. Where renewed agreement is required, it is requested through a clear action. Continued use or silence is not treated as consent to new processing that legally requires separate consent.",
      "The accepted version and transaction details govern existing activities unless inconsistent with mandatory law. Changes are not applied retroactively to reduce lawfully accrued rights. Document versions are displayed so users can request the terms associated with their accounts."
    ),
    section("Language, severability, and final statement",
      "The document is provided in Indonesian for users of services in Indonesia. Translations, summaries, icons, and short explanations aid understanding and must not conceal important terms. Where meanings differ, interpretation considers the Indonesian text, the intention of the lawful agreement, and consumer rights.",
      "If a clause is unenforceable, the others remain applicable insofar as lawfully separable. Not exercising a right on one occasion is not an automatic waiver. Transferring a service relationship to another party must respect user rights, transaction obligations, and personal data protection.",
      "By pressing I have read and agree after reaching the end, you confirm you had the opportunity to read, understand the main rights and obligations, and accept the lawful terms of this version. You may still seek explanations and exercise protected rights. The references below support further examination."
    ),
  ],
};

const privacy: LegalDocument = {
  title: "Slivadoc Privacy Policy",
  introduction: "This policy explains which personal data is processed, its sources, purposes and recipients, how it is stored, and how you exercise your rights. Each feature requires only information appropriate to its context. Reading and accepting this policy does not grant unlimited permission over all data, marketing, or disclosure to any party.",
  sections: [
    section("Data controller, scope, and privacy contact",
      "PT Sliva Technology Indonesia is the personal data controller for processing whose purposes and methods Slivadoc determines. This policy covers the website, Pet Owner application, registration, support, and features operated by Slivadoc. It also explains necessary data exchanges with partners and technology providers.",
      "Send questions, rights requests, or privacy complaints to privacy@slivadoc.com or in-app Customer Support Chat. Describe the request, relevant account, and a safe reply contact. Do not include passwords, OTPs, bank PINs, or full identity-document copies in an initial complaint unless necessary.",
      "Clinics, veterinarians, shops, sitters, event organisers, payment providers, and others may have separate processing responsibilities. Their roles depend on their activities, not merely the label partner. Read their policies when using their services; Slivadoc remains responsible for processing within its control."
    ),
    section("Personal data and processing activities",
      "Personal data is information about an identified or identifiable individual, alone or combined with other information. Processing includes obtaining, collecting, handling, analysing, storing, correcting, displaying, transmitting, disclosing, deleting, and destroying information according to the service context.",
      "Pet information is not always human personal data on its own. However, profiles, visit histories, photos, locations, and documents may identify owners when linked to accounts and contacts. In those circumstances, the linked information is treated as part of personal data processing.",
      "Truly anonymised data that can no longer reasonably be linked to a person differs from data that is merely masked or coded. Removing a name alone does not necessarily anonymise data. Information that can still be linked back to an account continues to require protection and an appropriate processing basis."
    ),
    section("Legal framework and processing principles",
      "This policy primarily refers to Law No. 27 of 2022 on Personal Data Protection (UU PDP), the Electronic Information and Transactions Law (UU ITE) as amended by Laws No. 19 of 2016 and No. 1 of 2024, Government Regulation No. 71 of 2019, and relevant electronic commerce and consumer protection rules. Article references explain rights and duties without limiting rights to the articles mentioned.",
      "Processing requires a lawful basis under Article 20 of UU PDP, clear purposes, relevant scope, and proportionate measures. Data should be accurate, used transparently, protected from unauthorised access, and retained no longer than its purpose or legal duties require.",
      "Bases may include performing an agreement or pre-contractual request, legal obligations, legitimate interests after balancing rights, or specific consent. Vital interests concern the safety of human data subjects and are not automatically invoked merely because an animal needs care."
    ),
    section("Account and user identity data",
      "Account data includes full name, email, phone number, internal account identifier, verification status, registration time, language preference, and necessary profile changes. Authentication data includes password hashes, verification records, sessions, and information needed to prevent unauthorised access.",
      "Recipient names, shipping addresses, emergency contacts, or billing information may be requested for particular services. Government identification numbers, authority documents, or representation details are not mandatory fields for ordinary Pet Owner registration; where needed for a particular case, the purpose and scope must be explained.",
      "Slivadoc does not request religion, political views, human health history, or biometric data as general conditions for creating a Pet Owner account. Do not add such information to names, bios, chats, or attachments when irrelevant. Unrequested information can still create risks, so collection should be limited from the outset."
    ),
    section("Specific personal data and sensitive information",
      "Under UU PDP, specific personal data includes human health, biometric, genetic, criminal-record, children's, and personal financial data, among other categories. Slivadoc distinguishes these from animal health information, although both can appear in the same file or transaction.",
      "Payment histories, refund bank-account identities, or children's information submitted through support require handling appropriate to their necessity and risk. Identity photos, home interiors, keys, access codes, and visit locations may also pose high risks even where their legal classification differs.",
      "Avoid uploading unrequested human data, including personal diagnoses, bank-card photos, national identification numbers, or unrelated third-party information. Where a document contains unnecessary parts, mask them if doing so does not undermine validity or legitimate service requirements."
    ),
    section("Sources of data",
      "Data is obtained directly when you register, complete profiles, add pets, upload documents, order services, pay, send messages, or request help. It may also come from device permissions you choose, such as location or media actively selected for submission.",
      "Partners may provide updates related to your transactions, including booking status, invoices, visits, service records, or document verification. Payment and delivery providers may supply references, statuses, and reconciliation information needed to complete services.",
      "Family members or authorised parties may enter your information as a recipient, caregiver, or emergency contact. Systems also produce technical records such as access times and authentication outcomes. If you believe someone supplied your data without authority, contact us to examine its source, purpose, and authorisation."
    ),
    section("Required and optional data, and consequences of withholding it",
      "Registration requires a full name, email, valid phone number, password, email verification, and acceptance of the Terms and Conditions and Privacy Policy. Without necessary data and acceptance, an account cannot be activated through that registration flow. Public information remains readable according to guest-feature availability.",
      "Additional information follows service needs: addresses for delivery, pet identities for care, schedules for bookings, and supporting documents for applications. Withholding genuinely necessary information may prevent a particular service from proceeding; this does not mean every feature requires all your data.",
      "Profile photos, community content, device location permission, and AI assistance depend on your feature choices. Marketing consent, if requested, must be separate and cannot be a condition for core services that do not need it. A mandatory form label must not justify excessive collection."
    ),
    section("Registration, authentication, and session management",
      "Names and contacts create accounts, deliver verification and service notices, and support recovery. Passwords are processed for authentication checks and stored as hashes. OTPs are temporary credentials and must remain confidential despite their limited validity.",
      "The app stores session information and certain preferences to keep you signed in and resume navigation. Login records, password updates, authentication failures, and session revocations support security and incident investigation. End access on shared devices by logging out.",
      "The main bases are providing the account you request and legitimate interests in securing the service. Updates and recovery requests may need proportionate additional verification. We do not ask you to reveal a password through chat or email to prove account ownership."
    ),
    section("Pet profiles and family access",
      "Pet names, species, breeds, birth dates or estimated ages, sex, photos, identities, and related attributes help tailor services. When linked to an owner, this information may reveal the owner's habits, family relationships, and activity history.",
      "Family features process invitees' identities or contacts, roles, permissions, and access statuses. Authorised members may view or use profile, health, or booking information within their permissions. Grant the minimum necessary access and review it when caregiving relationships change.",
      "Revocation applies to subsequent system access. Copies already received cannot always be retrieved, particularly where recipients have independent recordkeeping duties. Report the user, pet, and information involved if there is a dispute or unauthorised access."
    ),
    section("Animal health history and consultations",
      "Pet symptoms, care history, vaccinations, allergies, medicines, examination results, appointments, and consultation notes may be processed for the animal-health services you choose. Veterinarians or clinics may add service information within their authority and care relationship.",
      "Animal health records linked to an account can still reveal the owner's identity and activities. We limit use to services, support, lawful records, and explained related needs. Do not put irrelevant human medical information into animal symptom fields.",
      "Clinics or veterinarians may act as independent controllers for professional records and legal duties. Medical-record corrections differ from ordinary profile changes, to preserve accurate service history. Contact the provider or support for explanations about records you cannot directly edit."
    ),
    section("Orders, bookings, payments, invoices, and deliveries",
      "We process chosen goods or services, quantities, prices, pets, schedules, addresses, recipients, payment references, transaction statuses, invoices, cancellations, and refunds. This provides services, reconciles payments, fulfils recordkeeping duties, handles complaints, and prevents unauthorised transactions.",
      "Payment providers receive information needed for your selected method; delivery providers receive necessary recipient and shipping details. Slivadoc must not ask for bank PINs or OTPs through support conversations. Do not upload payment-card photos revealing confidential information.",
      "Invoices and transaction data may be retained after an account becomes inactive where required for commerce, tax, evidence, or disputes. Retention is limited to lawful purposes and does not automatically authorise reuse for marketing."
    ),
    section("Pet Sitter, visit addresses, and home information",
      "Visits may require an address, access directions, timing, owner and emergency contacts, pet habits, and care instructions. Data is shared with those performing the service only as needed for the booking, not with every sitter simply because you create an account.",
      "Door codes, keys, belongings' locations, empty-home schedules, and interior photos can create security risks. Share narrowly through agreed channels, avoid public profiles, and change temporary access after service where possible. Do not grant access to unnecessary rooms or devices.",
      "Report photos should focus on the pet and relevant work. Ask that residents' faces, household documents, addresses, and personal belongings not be shown without a lawful reason. Reports are retained for service delivery, complaints, and relevant retention duties; users may request review of excessive photos or information."
    ),
    section("Pet Documents and file attachments",
      "Uploads may contain pet and owner identities, vaccination history, examination letters, travel, signatures, or issuer information according to requirements. Files support completeness checks, applications, revision requests, and transmission to authorised parties for the service.",
      "Slivadoc uses Cloudinary to store and deliver media or documents according to service configuration. Upload links may be accessible to anyone who obtains them; treat document links as confidential, not as material safe for public forums. Avoid unnecessary human data.",
      "Replacement files must remain relevant to requirements. Earlier records or other attachments may be needed to continue applications and preserve evidence. If you upload the wrong document, contact support with the application identifier and filename without redistributing its contents. Account deletion and provider-held copies require assessment according to request scope and remaining duties."
    ),
    section("Location, maps, search, and place reports",
      "Location may include a city you enter, delivery or visit addresses, map points, or device coordinates where you permit the relevant feature. It supports place searches, results, area-based services, navigation, or reports you choose.",
      "You may deny or revoke device location permission. Use manual city or address entry where available. Refusal may reduce distance or recommendation accuracy without automatically cancelling your account. This policy does not grant general permission for continuous background tracking.",
      "Search and maps may involve Photon, OpenStreetMap, or other mapping providers used by the service. Requests may transmit relevant search terms, coordinates, or technical information. Review the visibility of PetSpot, Petship, or missing-animal reports before including a private address."
    ),
    section("Photos, video, cameras, microphones, and device media",
      "Camera, gallery, file, or microphone access is used when you choose a feature needing it, such as pet photos, attachments, service reports, or consultations. Device permission does not mean the entire gallery is uploaded; submitted files follow your selection and the feature's operation.",
      "Media may contain faces, voices, home backgrounds, address signs, metadata, or other people. Review it before uploading and ensure you are authorised to share it. Do not assume the app always strips all metadata or recognises every sensitive detail in photos and PDFs.",
      "You can change permissions in device settings. Do not assume calls and broadcasts are automatically recorded. Where recording is offered, its purposes, recipients, and storage must be explained in context; this general policy is not unlimited consent to record every conversation."
    ),
    section("Community, reviews, adoption, PAW Dating, and missing animals",
      "Content you publish may reveal display names, photos, pet details, stories, reviews, locations, or contact methods according to the feature. Others can read, copy, or forward public content beyond Slivadoc's direct control.",
      "Adoption forms and pet interactions may share care experience, living conditions, reasons for applying, and other information with relevant recipients. Distinguish private assessment information from community-visible content. Do not use features for bulk collection of other people's data.",
      "Missing-animal reports may need helpful locations and contacts, but avoid household routines, complete ownership documents, or identification numbers. Deleting Slivadoc content does not guarantee immediate removal of third-party device copies or search caches; we may assist within our authority."
    ),
    section("SlivaCare and AI-provider processing",
      "When you use SlivaCare, questions, conversations, and necessary pet context may be sent to AI model providers such as OpenAI to generate responses. Relevant information may include species, age, symptoms, or history supplied through that feature.",
      "Provider processing depends on service contracts and configuration. This policy does not promise that every provider retains data for zero days or that every form of provider data use has been eliminated. Request information through the privacy contact about the configuration applicable to your service.",
      "Do not send unnecessary passwords, OTPs, card details, human identity documents, children's information, or others' secrets. New uses of conversations beyond service provision require an appropriate processing basis and notice. Account acceptance is not automatic permission to sell conversations or use them for unrelated marketing."
    ),
    section("Shop chats, service messages, complaints, and support",
      "Messages, senders, recipients, times, conversation identifiers, and attachments are processed to deliver communication, maintain service history, and handle complaints. Recipients can read content addressed to them and hold copies needed for the service relationship.",
      "Authorised staff may access relevant information to answer complaints, investigate suspected fraud, or meet legal duties. Access must be limited by work needs. This policy does not claim that every chat is end-to-end encrypted or technically inaccessible to the operator.",
      "Mask unrelated third-party information in conversation evidence. Do not give shops or support bank access, security codes, or excessive document copies. Abuse reports may require evidence retention after ordinary content is deleted, with appropriate purpose and access limits."
    ),
    section("Technical data, local storage, and cookie-like technologies",
      "The website and app may process IP addresses, device types, operating systems, app versions, request times, response results, and service-related error logs. This helps run systems, identify disruptions, prevent abuse, and investigate failed transactions.",
      "Local and session storage support authentication, language, active pets, and the last page or feature viewed, among other functions. Data may reside in browser or app storage on your device. Clearing storage or logging out may remove preferences and require a fresh sign-in.",
      "Technology necessary for account functions is distinct from additional analytics, cross-service tracking, or behavioural advertising. If such additional processing is introduced and needs consent, explanations and choices must be provided separately. Accepting this policy does not itself enable unlimited advertising tracking."
    ),
    section("Purposes and corresponding processing bases",
      "Account creation, contact verification, requested searches, ordering, payments, deliveries, care services, and related support primarily fulfil an agreement or your pre-contractual request. Data used must relate directly to those service needs.",
      "Transaction records, lawful authority requests, and legally required retention rely on legal obligations. Fraud detection, system security, troubleshooting, and defending claims may rely on legitimate interests after considering necessity, impact, and user rights; this is not permission to collect every available datum.",
      "Optional processing requiring consent must specify its purpose, data types, and consequences of withdrawal. New purposes incompatible with the original need review and notice with an appropriate basis. We do not silently substitute processing reasons to evade a lawful request to stop."
    ),
    section("Partner recipients and purpose limitations",
      "Shops receive order, communication, and recipient information needed to fulfil purchases. Clinics, veterinarians, trainers, and care providers receive pet details, schedules, symptoms, and contacts for the service. Sitters receive visit details and instructions needed for the relevant booking.",
      "Class and event organisers may receive registered participants and pet details; venue operators receive reservation details; adoption organisers receive applications addressed to them; document authorities receive necessary requirements. Data should not be shared with every partner merely because they are on the platform.",
      "Partners must not use received data for spam, data trading, public disclosure, or other activities without a lawful basis. Where partners determine independent purposes, such as mandatory clinical records, they must fulfil controller duties. You may request explanations about recipients in a particular transaction."
    ),
    section("Technology, payment, communication, and logistics providers",
      "Cloudinary is used for media and documents. Hosting, database, network, and content-delivery infrastructure process data according to technical functions. Email services, including Resend where used in the service environment, process destination addresses and service messages such as verification or notices.",
      "Yokke and displayed payment providers process necessary payment and reconciliation information. Lion Parcel and related delivery providers process addresses, recipient contacts, shipment details, and tracking. OpenAI may process AI-feature context, while Photon/OpenStreetMap support search or maps according to implementation.",
      "This list describes providers used or integrated into the service; it does not mean all data always goes to every provider. Involvement depends on active features and configurations. Provider changes materially affecting purposes, recipients, or transfers require information and an appropriate basis before implementation."
    ),
    section("Controllers, processors, and authority requests",
      "Providers processing under Slivadoc's instructions act within processor functions and lawful instructions. Access, confidentiality, security, onward processing by subprocessors, and termination arrangements must consider data protection. Parties determining their own purposes may have separate controller obligations.",
      "Law-enforcement, regulator, and court requests are assessed for authority, legal basis, scope, and form. Disclosure must be limited to necessary information. Users are notified where required or permitted without breaching lawful prohibitions or interfering with legally protected proceedings.",
      "Mergers, business transfers, or restructuring involving data must respect notice obligations, processing purposes, and user rights. Data is not freely tradable simply because it forms part of business assets. Recipients still need an appropriate basis and safeguards."
    ),
    section("Public visibility, links, and off-platform copies",
      "Public profiles or content may be accessible to other users and, depending on publication, search engines. Check settings and purposes before posting. Private forms, partner messages, and community posts have different recipients.",
      "Recipients can forward image or document links. Do not equate hard-to-guess links with login-protected access. Avoid placing identity documents, complete account numbers, or home-security information in media that may be shared through links.",
      "Removing content from the app does not always remove independently stored copies. We can review deletion requests and contact providers within our authority, but do not promise complete control of every internet copy. Others' reuse still requires a lawful basis."
    ),
    section("Transfers outside Indonesia",
      "Cloud, communication, AI, and technology providers may process or store data outside Indonesia according to infrastructure locations. Certain features may therefore involve cross-border transfers. This policy does not state that all data is located exclusively in Indonesia.",
      "Article 56 of UU PDP requires safeguards for transfers outside Indonesian jurisdiction. Assessment considers an equal or higher level of protection in the receiving country; if that is not satisfied, adequate and binding protection; and if neither condition is satisfied, data-subject consent under applicable requirements.",
      "Acceptance of a general policy is not automatic consent to every undisclosed transfer. Where a transfer requires specific consent, the recipient, purpose, data types, and relevant consequences must be explained. You may request information about cross-border processing related to your services."
    ),
    section("Retention principles and category-specific periods",
      "Account and profile data is kept as needed for active services, lawful recovery, or related obligations. Family access, bookings, and attachments are reviewed according to the service relationship, activity status, evidence needs, and applicable special duties.",
      "Electronic-commerce data and information within Article 25 of Government Regulation No. 80 of 2019 require minimum retention of 10 years from acquisition for financial transactions and 5 years for nonfinancial matters. These periods apply according to legal category and scope; they do not justify keeping every photo, chat, or pet location for the same period without assessment.",
      "Security logs, acceptance evidence, and complaint records are kept as needed for accountability, incident reviews, and defence of lawful rights. Relevant data may be held during a dispute or lawful preservation order until that need ends. Access and other uses remain restricted.",
      "Data without a remaining retention purpose or basis must be deleted, destroyed, or adequately anonymised. Backups follow storage and recovery cycles; active-system deletion may not occur simultaneously in every backup. Request applicable retention details for particular data and activities through the privacy contact."
    ),
    section("Account deletion and handling data copies",
      "Delete Account is available under Privacy & security and uses OTP verification. After confirmation, deletion is scheduled with the app's 14-day grace period so you can cancel an erroneous request. Account deletion differs from logging out or uninstalling the app.",
      "The account grace period does not automatically postpone correction, access, consent-withdrawal, or restriction rights with statutory deadlines under UU PDP. Submit those requests separately through the privacy contact. Completing orders or mandatory retention only justifies keeping genuinely necessary data, not an entire account for every purpose.",
      "Transaction, dispute, and legally required records may be retained in limited form after profile closure. Independent partner controllers may retain copies under their own duties. Requests concerning attachments, media, or supporting-provider data must be assessed and followed up within request scope and each party's authority.",
      "You may request an explanation of categories deleted, anonymised, or retained and the reasons. Deletion or destruction notices follow legal obligations, including Article 45 of UU PDP. Legally retained data must not be used to continue promotions you have declined."
    ),
    section("Security, access limits, and device responsibilities",
      "System protections include password hashing, authentication and session management, role-based access, data-authority checks, and relevant security records. Technical and organisational measures must match data types, risks, and processing context.",
      "No system can guarantee absolute security. This policy does not claim ISO or SOC certification, particular audits, end-to-end encryption, or malware scanning of every file unless separately stated and substantiated. Limitations do not reduce the duty to take appropriate protective measures.",
      "Help protect security by updating the app, keeping credentials confidential, locking devices, avoiding suspicious networks or links, and revoking unnecessary access. Report suspected breaches with minimum evidence; do not redistribute others' data or download more to prove a vulnerability."
    ),
    section("Personal data protection incidents",
      "Suspected unauthorised access, misdirected information, lost devices containing data, and exposed attachments undergo incident assessment. Measures may include restricting access, revoking sessions, securing evidence, tracing scope, coordinating providers, and relevant recovery.",
      "Article 46 of UU PDP requires written notification within 3 × 24 hours to data subjects and the competent institution in the event of a personal data protection failure. Notices must at least describe the exposed data, when and how the incident occurred, and response and recovery measures. Public notification is made where legally required.",
      "Users may receive relevant guidance, such as changing passwords, revoking sessions, or watching for follow-up fraud. We do not request money transfers or OTPs to handle incidents. Information may be updated as findings develop, without using internal investigation to disregard notification duties."
    ),
    section("Rights to information, access, copies, and correction",
      "Under UU PDP, you are entitled to information on controller identity, processing bases, purposes, and accountability of parties using data. You may also request access, copies, and processing-trail information according to law, with protection for others' data.",
      "You may complete, update, or correct inaccurate information through available settings or by contacting us. Profile errors differ from disputes over service records; transaction or medical corrections may need to preserve history and recordkeeping duties.",
      "Requests must not be refused solely because you are no longer an active customer. Where data cannot partly be supplied or changed because of law, others' rights, or other lawful reasons, scope and reasons should be explained insofar as permitted. Restrictions must be specific, not a general exception."
    ),
    section("Deletion, portability, objection, and compensation rights",
      "You may request termination of processing, deletion or destruction, withdrawal of consent, and suspension or restriction under legal conditions. Requests are assessed by category and purpose because some retention duties may survive the end of other processing.",
      "Portability includes obtaining and using data in the legally required format and transmission to another controller where conditions are met. You may also object to decisions based solely on automated processing, including profiling, that produce legal effects or significant impacts.",
      "UU PDP also provides rights to bring claims and receive compensation for processing violations according to law. Using Slivadoc support does not remove those rights or require a waiver. For full explanations, refer, among other provisions, to Articles 5 through 13 of UU PDP."
    ),
    section("Submitting requests and verifying identity",
      "Send requests from an account contact you control, identifying the right to exercise, data types, and relevant activities. Explain your authority if acting as a guardian or representative. We may request minimum verification to prevent unauthorised disclosure or deletion.",
      "Verification must not become excessive document collection. Where sessions, email, or transaction evidence adequately verify identity, additional identity copies must be considered proportionately. Representation must protect the represented person's rights and does not automatically open all family data.",
      "You will receive information about follow-up through appropriate channels. Broad requests or those involving others' data may require clarification or masking of particular parts. If wholly or partly refused, reasons and complaint options are provided insofar as legally permitted."
    ),
    section("Data-rights deadlines and lawful restrictions",
      "Article 30 of UU PDP requires corrections or updates within 3 × 24 hours of receiving the request; Article 32 requires access within 3 × 24 hours of receiving an access request. Ending processing after consent withdrawal and suspending or restricting processing also have 3 × 24-hour provisions under Articles 40 and 41, subject to statutory conditions and exceptions.",
      "Verification, clarification, and operations must not unilaterally extend statutory deadlines. Deletion, destruction, portability, and other requests follow the rules applicable to each right; we do not impose one general deadline that reduces rights with shorter limits.",
      "Exceptions must rest on genuinely applicable provisions, such as others' rights or specific legal duties, and be limited to necessity. Security, business interests, or disputes must not be blanket reasons to reject every request without assessment."
    ),
    section("Withdrawing consent and marketing preferences",
      "You may withdraw consent for processing actually based on consent through the privacy contact or available feature choices. Withdrawal does not retroactively invalidate lawful earlier processing. We must explain which data and purposes cease and the effects on related features.",
      "Where data is needed for an ongoing contract or legal duty, limited processing may continue on that basis with an appropriate explanation. This does not permit a contrived change of basis simply to continue all uses after your refusal.",
      "Marketing you choose to receive must be distinguished from transaction, OTP, security, or mandatory notices. Refusing promotions does not block core services that do not require them. Acceptance of this policy does not authorise selling data as a commodity to advertisers."
    ),
    section("Children, guardians, and users needing assistance",
      "Children's data requires special protection and parent or guardian consent under Article 25 of UU PDP. Ordinary Pet Owner registration is intended for legally capable users; accounts must not bypass age restrictions. Guardians may request review and handling of children's information submitted without authority.",
      "Features accessible to children must consider UU ITE, Government Regulation No. 17 of 2025, and Minister of Communication and Digital Affairs Regulation No. 9 of 2026 within their scope, including risk assessments, necessary age or guardian mechanisms, and reporting. General guardian consent does not remove duties to restrict unsuitable features.",
      "Processing involving people with disabilities follows UU PDP's special provisions, with understandable communication and lawful assistance or representation where needed. Needing assistance does not automatically remove control over one's data. Disability information must not be requested without relevance and an appropriate basis."
    ),
    section("Recommendations, profiling, and human review",
      "Search or recommendation order may reflect pet type, search location, availability, categories, price, ratings, or filters. This helps users find services but does not guarantee the first result is most suitable for every need or free from data limitations.",
      "Security checks may use activity patterns to detect excessive requests or abuse. Where solely automated decisions produce legal effects or significant impacts, objection and review rights under UU PDP must be respected.",
      "You may seek explanations about decisions or restrictions affecting your account and provide corrections. AI answers do not themselves authorise a system to make final medical, adoption, legal-eligibility, or user-liability decisions."
    ),
    section("Privacy complaints and relationships with other parties",
      "If you believe data was misused, identify the data, activity, suspected recipient, and known impact in your complaint. We may inspect processing records, explain roles, coordinate processor follow-up, or direct parts of a request to the responsible independent controller.",
      "Referring a request to a partner does not remove Slivadoc's own duties. You may still complain to competent institutions or authorities and use available legal remedies. This policy does not make internal resolution the sole route or prohibit lawful complaints.",
      "Limit data sharing when submitting evidence to avoid further exposure. If you mistakenly receive someone else's document, do not distribute it; report how it arrived and follow lawful handling instructions without carelessly destroying important evidence."
    ),
    section("Policy changes, versions, and the meaning of acceptance",
      "The document displays its version and effective date. Material changes to purposes, data categories, recipients, transfers, or user rights are notified through appropriate channels before implementation where required by law. Renewed consent is requested where needed; old versions must not conceal unexplained new purposes.",
      "During registration, open and read the Privacy Policy to the end separately from the Terms and Conditions, then press I have read and agree. Slivadoc records the acceptance version and time. Closing without that button does not select the acceptance checkbox.",
      "Acceptance shows you had the opportunity to understand this notice and accept processing within lawful purposes and bases. It does not waive data rights, grant every device permission at once, or provide blanket consent to marketing, publication of private documents, or transfers needing specific consent."
    ),
    section("Practical data protection guidance and closing provisions",
      "Regularly review your profile, family-access recipients, addresses, and device permissions. Use pet photos that do not reveal documents or home security. Submit only requested attachments, check recipients, and use official support for unusual data requests.",
      "Before sharing someone else's information, ensure authority and explain the purpose. Check recipient information and policies before using partner services. If processing is unclear, request an explanation at privacy@slivadoc.com; privacy questions do not require buying a new service.",
      "Read this policy together with feature-specific information and applicable rules. Mandatory legal rights and duties take priority over conflicting terms. The official references below help you examine the framework and do not limit other rules that may apply to particular circumstances."
    ),
  ],
};

export const englishLegalDocuments: Record<LegalPolicy, LegalDocument> = { terms, privacy };
