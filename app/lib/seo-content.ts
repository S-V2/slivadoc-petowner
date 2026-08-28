export type FaqItem = { question: string; answer: string };

export type ServicePage = {
  slug: string;
  name: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  benefits: string[];
  checklist: string[];
  related: string[];
  keywords: string[];
  faq: FaqItem[];
};

export type GuidePage = {
  slug: string;
  title: string;
  description: string;
  category: string;
  reviewedBy: string;
  updatedAt: string;
  readMinutes: number;
  intro: string;
  sections: Array<{ heading: string; body: string; points?: string[] }>;
  faq: FaqItem[];
};

export type CityPage = {
  slug: string;
  name: string;
  province: string;
  description: string;
  intro: string;
  nearbyAreas: string[];
};

export const servicePages: ServicePage[] = [
  {
    slug: "dokter-hewan-online",
    name: "Dokter Hewan Online",
    title: "Konsultasi Dokter Hewan Online di Slivadoc",
    description: "Konsultasi chat, panggilan suara, atau video dengan dokter hewan terverifikasi untuk membantu menentukan langkah perawatan anabul.",
    eyebrow: "Konsultasi veteriner",
    intro: "Ceritakan kondisi anabul, pilih metode konsultasi, dan simpan rangkuman percakapan agar tindak lanjut kesehatannya lebih terarah.",
    benefits: ["Pilihan chat, voice call, video call, dan paket", "Profil serta pengalaman dokter terlihat sebelum memilih", "Terhubung dengan profil dan riwayat kesehatan pet", "Arahan tindak lanjut ketika pemeriksaan langsung diperlukan"],
    checklist: ["Catat kapan gejala mulai muncul", "Siapkan foto atau video gejala bila relevan", "Tulis obat, makanan, dan alergi yang diketahui", "Untuk kondisi gawat, segera datangi fasilitas veteriner terdekat"],
    related: ["klinik-hewan", "vaksinasi-hewan", "home-service-hewan"],
    keywords: ["dokter hewan online", "konsultasi dokter hewan", "dokter hewan 24 jam", "dokter hewan terdekat"],
    faq: [
      { question: "Kapan konsultasi dokter hewan online dapat digunakan?", answer: "Konsultasi online cocok untuk penilaian awal, edukasi perawatan, pemantauan, dan tindak lanjut. Dokter dapat menyarankan pemeriksaan langsung bila kondisi tidak aman dinilai jarak jauh." },
      { question: "Apakah kondisi darurat boleh ditangani melalui chat?", answer: "Jangan menunda pertolongan langsung untuk kondisi seperti kesulitan bernapas, kejang, perdarahan berat, tidak sadar, atau dugaan keracunan. Cari klinik atau rumah sakit hewan terdekat." },
    ],
  },
  {
    slug: "klinik-hewan",
    name: "Klinik Hewan",
    title: "Cari Pet Clinic & Klinik Hewan Terdekat",
    description: "Temukan klinik hewan, informasi layanan, lokasi, jadwal, dan pilihan booking pet clinic melalui Slivadoc.",
    eyebrow: "Perawatan langsung",
    intro: "Bandingkan layanan klinik berdasarkan kebutuhan pet, lokasi, ketersediaan, dan informasi yang ditampilkan mitra sebelum membuat booking.",
    benefits: ["Pencarian berbasis lokasi", "Informasi layanan dan harga yang transparan", "Booking terhubung dengan aktivitas pet owner", "Riwayat perawatan tersimpan pada profil pet"],
    checklist: ["Periksa jenis hewan yang dilayani", "Pastikan layanan yang dibutuhkan tersedia", "Bawa catatan vaksin dan obat", "Tanyakan prosedur kedatangan untuk kasus menular"],
    related: ["dokter-hewan-online", "vaksinasi-hewan", "petshop"],
    keywords: ["klinik hewan terdekat", "pet clinic", "rumah sakit hewan", "dokter hewan terdekat"],
    faq: [
      { question: "Bagaimana memilih klinik hewan?", answer: "Cocokkan fasilitas, pengalaman tenaga medis, jam layanan, jarak, serta kemampuan menangani spesies dan kebutuhan pet Anda." },
      { question: "Apa yang perlu dibawa saat kunjungan pertama?", answer: "Bawa identitas pet, catatan vaksin, daftar obat atau suplemen, hasil pemeriksaan terdahulu, dan kronologi kondisi secara ringkas." },
    ],
  },
  {
    slug: "petshop",
    name: "Petshop",
    title: "Petshop Online & Pet Shop Terdekat di Slivadoc",
    description: "Cari makanan, kebutuhan harian, perlengkapan, dan petshop tepercaya dengan stok serta harga yang dikelola mitra Slivadoc.",
    eyebrow: "Kebutuhan anabul",
    intro: "Jelajahi produk pet berdasarkan kategori dan kebutuhan, lalu pilih petshop yang paling relevan dengan lokasi serta profil hewanmu.",
    benefits: ["Produk dan layanan dalam satu pencarian", "Stok serta harga dari sistem mitra", "Kategori untuk beragam jenis hewan", "Pembelian terhubung dengan aktivitas akun"],
    checklist: ["Cocokkan produk dengan spesies dan tahap hidup", "Periksa komposisi serta petunjuk pemakaian", "Hindari mengganti pakan secara mendadak", "Konsultasikan kebutuhan medis dengan dokter hewan"],
    related: ["grooming-hewan", "klinik-hewan", "pet-hotel"],
    keywords: ["petshop terdekat", "pet shop online", "makanan kucing", "makanan anjing", "perlengkapan hewan"],
    faq: [
      { question: "Apakah stok produk di Slivadoc diperbarui?", answer: "Ketersediaan mengikuti data inventori yang dikelola oleh mitra. Konfirmasi akhir dilakukan saat transaksi atau pemrosesan pesanan." },
      { question: "Bagaimana memilih makanan pet?", answer: "Sesuaikan dengan spesies, usia, ukuran, aktivitas, kondisi tubuh, dan riwayat kesehatan. Mintalah arahan dokter hewan untuk diet khusus." },
    ],
  },
  {
    slug: "grooming-hewan",
    name: "Grooming Hewan",
    title: "Grooming Kucing & Anjing Terdekat",
    description: "Temukan layanan grooming kucing, grooming anjing, mandi, potong kuku, dan perawatan bulu melalui Slivadoc.",
    eyebrow: "Kebersihan dan kenyamanan",
    intro: "Pilih jenis grooming sesuai kebutuhan pet dan sampaikan kondisi kulit, perilaku, serta catatan khusus sebelum sesi dimulai.",
    benefits: ["Pilihan grooming berdasarkan lokasi", "Jenis layanan dan durasi terlihat jelas", "Catatan kebutuhan pet dapat disampaikan", "Booking tersimpan pada aktivitas akun"],
    checklist: ["Sampaikan alergi dan kondisi kulit", "Beri tahu bila pet mudah takut atau agresif", "Hindari grooming saat pet sedang sakit", "Periksa kondisi kulit dan kuku setelah layanan"],
    related: ["petshop", "home-service-hewan", "pet-hotel"],
    keywords: ["grooming kucing terdekat", "grooming anjing", "pet grooming", "salon hewan"],
    faq: [
      { question: "Berapa sering pet perlu grooming?", answer: "Frekuensi berbeda berdasarkan spesies, ras, panjang bulu, aktivitas, dan kondisi kulit. Groomer atau dokter hewan dapat membantu menentukan jadwal yang sesuai." },
      { question: "Bolehkah grooming ketika pet sedang sakit?", answer: "Sebaiknya tunda dan konsultasikan terlebih dahulu. Stres, suhu, atau produk grooming tertentu dapat memperburuk kondisi sebagian hewan." },
    ],
  },
  {
    slug: "vaksinasi-hewan",
    name: "Vaksinasi Hewan",
    title: "Vaksin Kucing & Anjing dengan Dokter Hewan",
    description: "Cari layanan vaksinasi hewan dan kelola catatan vaksin kucing atau anjing melalui profil kesehatan Slivadoc.",
    eyebrow: "Pencegahan penyakit",
    intro: "Jadwal vaksin perlu disesuaikan dengan usia, riwayat vaksin, lingkungan, perjalanan, dan penilaian dokter hewan.",
    benefits: ["Temukan fasilitas yang menyediakan vaksinasi", "Catatan vaksin terhubung dengan profil pet", "Pengingat perawatan membantu tindak lanjut", "Riwayat dapat dibawa ke konsultasi berikutnya"],
    checklist: ["Pastikan pet dalam kondisi sehat", "Bawa catatan vaksin sebelumnya", "Informasikan reaksi vaksin terdahulu", "Pantau pet setelah vaksin sesuai arahan dokter"],
    related: ["klinik-hewan", "dokter-hewan-online", "home-service-hewan"],
    keywords: ["vaksin kucing", "vaksin anjing", "jadwal vaksin kucing", "harga vaksin hewan"],
    faq: [
      { question: "Apakah jadwal vaksin semua pet sama?", answer: "Tidak. Dokter hewan menentukan jadwal berdasarkan usia, riwayat, risiko paparan, kondisi kesehatan, jenis vaksin, dan pedoman yang berlaku." },
      { question: "Apa yang dilakukan sebelum vaksin?", answer: "Dokter biasanya menilai kondisi umum pet. Sampaikan bila pet sedang sakit, minum obat, hamil, atau pernah mengalami reaksi setelah vaksin." },
    ],
  },
  {
    slug: "pet-hotel",
    name: "Pet Hotel",
    title: "Pet Hotel, Penitipan Kucing & Anjing Terdekat",
    description: "Bandingkan pet hotel dan penitipan hewan berdasarkan lokasi, fasilitas, aturan kesehatan, serta kebutuhan anabul.",
    eyebrow: "Penitipan yang terencana",
    intro: "Persiapkan kebutuhan makan, obat, kebiasaan, dan kontak darurat agar masa penitipan lebih aman dan nyaman untuk pet.",
    benefits: ["Cari penitipan berdasarkan lokasi", "Informasi fasilitas dan layanan", "Catatan kebutuhan pet lebih terstruktur", "Booking tercatat dalam aktivitas"],
    checklist: ["Tinjau kebersihan dan keamanan fasilitas", "Pastikan syarat vaksin dan kesehatan", "Siapkan makanan serta obat dengan label", "Berikan kontak dokter dan kontak darurat"],
    related: ["grooming-hewan", "petshop", "klinik-hewan"],
    keywords: ["pet hotel terdekat", "penitipan kucing", "penitipan anjing", "hotel hewan"],
    faq: [
      { question: "Apa yang perlu ditanyakan sebelum menitipkan pet?", answer: "Tanyakan rasio staf, pemisahan hewan, sanitasi, pengawasan, prosedur darurat, jadwal aktivitas, serta cara pemberian obat." },
      { question: "Apakah pet perlu vaksin sebelum menginap?", answer: "Banyak penitipan menetapkan persyaratan vaksin dan pencegahan parasit. Ikuti kebijakan fasilitas serta rekomendasi dokter hewan." },
    ],
  },
  {
    slug: "home-service-hewan",
    name: "Home Service Hewan",
    title: "Home Service Pet Care & Dokter Hewan ke Rumah",
    description: "Temukan layanan pet care ke rumah untuk kebutuhan yang tersedia di area Anda, dari perawatan hingga konsultasi terjadwal.",
    eyebrow: "Layanan ke rumah",
    intro: "Home service membantu pet yang sulit bepergian, tetapi jenis tindakan tetap harus disesuaikan dengan fasilitas, keamanan, dan penilaian tenaga profesional.",
    benefits: ["Pencarian layanan berdasarkan area", "Mengurangi perjalanan untuk pet tertentu", "Jadwal dan alamat tercatat", "Terhubung dengan aktivitas pet owner"],
    checklist: ["Jelaskan kebutuhan secara lengkap saat booking", "Siapkan area yang terang dan aman", "Pastikan pet dapat ditangani dengan aman", "Ikuti rujukan bila dibutuhkan fasilitas klinik"],
    related: ["dokter-hewan-online", "grooming-hewan", "vaksinasi-hewan"],
    keywords: ["dokter hewan ke rumah", "home service pet", "grooming panggilan", "pet care home service"],
    faq: [
      { question: "Apakah semua tindakan dapat dilakukan di rumah?", answer: "Tidak. Tindakan yang membutuhkan pemeriksaan, alat, sterilitas, observasi, atau penanganan darurat tertentu harus dilakukan di klinik atau rumah sakit hewan." },
      { question: "Bagaimana menyiapkan kunjungan home service?", answer: "Sediakan area aman dan terang, riwayat kesehatan, daftar obat, serta pendamping yang mengenal perilaku pet." },
    ],
  },
  {
    slug: "adopsi-hewan",
    name: "Adopsi Hewan",
    title: "Adopsi Kucing, Anjing & Hewan secara Bertanggung Jawab",
    description: "Temukan listing adopsi hewan dan proses screening yang mendorong kecocokan, kesiapan, serta kesejahteraan jangka panjang.",
    eyebrow: "Temukan keluarga yang tepat",
    intro: "Adopsi adalah komitmen jangka panjang. Slivadoc membantu calon adopter memahami profil, kebutuhan, dan proses yang ditetapkan pihak pemberi adopsi.",
    benefits: ["Profil hewan dan status kesehatan", "Proses pengajuan yang terstruktur", "Fokus pada kecocokan dan kesiapan", "Dukungan ekosistem pet care setelah adopsi"],
    checklist: ["Hitung biaya rutin dan darurat", "Pastikan seluruh anggota keluarga siap", "Periksa aturan hunian dan lingkungan", "Rencanakan pemeriksaan kesehatan awal"],
    related: ["klinik-hewan", "petshop", "dokter-hewan-online"],
    keywords: ["adopsi kucing", "adopsi anjing", "adopsi hewan", "adopsi anabul"],
    faq: [
      { question: "Apa yang dinilai dalam proses adopsi?", answer: "Pemberi adopsi dapat menilai kesiapan tempat tinggal, waktu, biaya, pengalaman, anggota keluarga, serta kecocokan dengan kebutuhan hewan." },
      { question: "Apa yang perlu dilakukan setelah adopsi?", answer: "Berikan masa adaptasi, jadwalkan pemeriksaan kesehatan, pertahankan rutinitas yang konsisten, dan lakukan pengenalan lingkungan secara bertahap." },
    ],
  },
];

export const guidePages: GuidePage[] = [
  {
    slug: "tanda-anabul-perlu-ke-dokter-hewan",
    title: "Tanda Anabul Perlu Segera Dibawa ke Dokter Hewan",
    description: "Kenali tanda bahaya umum pada hewan dan kapan sebaiknya mencari pertolongan veteriner tanpa menunda.",
    category: "Kesehatan", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 5,
    intro: "Perubahan perilaku, nafsu makan, napas, atau kesadaran dapat menjadi tanda masalah kesehatan. Penilaian langsung tetap diperlukan untuk diagnosis.",
    sections: [
      { heading: "Tanda yang membutuhkan pertolongan segera", body: "Cari fasilitas veteriner secepatnya bila pet menunjukkan kondisi yang berpotensi mengancam nyawa.", points: ["Kesulitan bernapas atau gusi tampak kebiruan", "Kejang berulang, pingsan, atau tidak sadar", "Perdarahan berat atau trauma besar", "Dugaan keracunan", "Tidak dapat buang air kecil disertai gelisah atau nyeri"] },
      { heading: "Perubahan yang perlu dipantau", body: "Muntah, diare, lesu, batuk, gatal, atau perubahan makan perlu dinilai bersama durasi, frekuensi, usia, dan kondisi kesehatan pet." },
      { heading: "Siapkan informasi untuk dokter", body: "Catat waktu mulai gejala, makanan atau obat terakhir, perubahan aktivitas, serta foto atau video bila aman untuk diambil." },
    ],
    faq: [{ question: "Apakah konsultasi online cukup untuk kondisi darurat?", answer: "Tidak. Konsultasi online tidak menggantikan pertolongan langsung untuk kondisi darurat. Segera hubungi atau datangi fasilitas veteriner terdekat." }],
  },
  {
    slug: "panduan-vaksin-kucing",
    title: "Panduan Vaksin Kucing untuk Pet Parent",
    description: "Pahami tujuan vaksin kucing, persiapan sebelum vaksin, dan pentingnya jadwal individual dari dokter hewan.",
    category: "Pencegahan", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 6,
    intro: "Vaksin membantu menurunkan risiko penyakit tertentu, tetapi jenis dan waktunya perlu diputuskan bersama dokter berdasarkan kondisi serta risiko kucing.",
    sections: [
      { heading: "Mengapa jadwal harus individual", body: "Usia, riwayat, kondisi kesehatan, gaya hidup indoor atau outdoor, lingkungan, dan risiko perjalanan memengaruhi rekomendasi vaksin." },
      { heading: "Sebelum vaksin", body: "Pastikan kondisi kucing dinilai dokter dan sampaikan riwayat penyakit, obat, kehamilan, alergi, atau reaksi vaksin sebelumnya.", points: ["Bawa buku atau catatan vaksin", "Hindari perubahan pakan mendadak", "Gunakan carrier yang aman", "Tanyakan tanda yang perlu dipantau setelah vaksin"] },
      { heading: "Setelah vaksin", body: "Ikuti instruksi fasilitas. Hubungi dokter bila muncul reaksi yang berat, memburuk, atau membuat Anda khawatir." },
    ],
    faq: [{ question: "Apakah kucing indoor tetap perlu vaksin?", answer: "Risikonya dapat berbeda, tetapi tidak selalu nol. Dokter hewan akan menilai kebutuhan berdasarkan lingkungan, kesehatan, kontak dengan hewan lain, dan aturan setempat." }],
  },
  {
    slug: "panduan-vaksin-anjing",
    title: "Panduan Vaksin Anjing dan Persiapannya",
    description: "Pelajari faktor yang memengaruhi jadwal vaksin anjing dan langkah aman sebelum serta setelah kunjungan.",
    category: "Pencegahan", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 6,
    intro: "Program vaksin anjing disusun berdasarkan usia, riwayat, kondisi kesehatan, lingkungan, perjalanan, dan risiko paparan.",
    sections: [
      { heading: "Penilaian sebelum vaksin", body: "Sampaikan keluhan, obat, riwayat reaksi, serta catatan vaksin. Dokter akan menentukan apakah vaksin dapat diberikan pada kunjungan tersebut." },
      { heading: "Kelola paparan dengan aman", body: "Anak anjing yang seri vaksinnya belum lengkap membutuhkan rencana sosialisasi yang aman. Mintalah rekomendasi dokter sesuai risiko daerah." },
      { heading: "Pemantauan setelah vaksin", body: "Reaksi ringan dapat terjadi, tetapi gejala berat atau cepat memburuk memerlukan pertolongan veteriner segera." },
    ],
    faq: [{ question: "Bolehkah anjing sakit divaksin?", answer: "Keputusan harus dibuat oleh dokter setelah pemeriksaan. Informasikan semua gejala sebelum vaksin diberikan." }],
  },
  {
    slug: "cara-memilih-makanan-kucing",
    title: "Cara Memilih Makanan Kucing yang Sesuai",
    description: "Panduan membaca kebutuhan dasar pakan kucing berdasarkan tahap hidup, kondisi tubuh, dan kesehatan.",
    category: "Nutrisi", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 7,
    intro: "Tidak ada satu pakan yang paling tepat untuk semua kucing. Pilihan perlu mempertimbangkan tahap hidup, kondisi tubuh, kesehatan, kebiasaan makan, dan rekomendasi profesional.",
    sections: [
      { heading: "Mulai dari profil kucing", body: "Pertimbangkan usia, aktivitas, status steril, berat badan, kehamilan atau menyusui, alergi, dan penyakit yang telah didiagnosis." },
      { heading: "Baca label secara utuh", body: "Periksa peruntukan tahap hidup, petunjuk pemberian, informasi produsen, penyimpanan, serta tanggal kedaluwarsa. Jangan menilai kualitas dari satu bahan saja." },
      { heading: "Lakukan transisi bertahap", body: "Perubahan pakan mendadak dapat mengganggu pencernaan. Ikuti transisi yang dianjurkan produsen atau dokter hewan." },
    ],
    faq: [{ question: "Apakah kucing boleh makan makanan anjing?", answer: "Makanan anjing tidak dirancang untuk memenuhi seluruh kebutuhan nutrisi kucing dalam jangka panjang. Gunakan pakan yang sesuai spesies dan konsultasikan kebutuhan khusus." }],
  },
  {
    slug: "cara-memilih-makanan-anjing",
    title: "Cara Memilih Makanan Anjing Berdasarkan Kebutuhannya",
    description: "Panduan praktis memilih pakan anjing sesuai usia, ukuran, aktivitas, kondisi tubuh, dan kesehatan.",
    category: "Nutrisi", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 7,
    intro: "Pakan yang sesuai membantu menjaga kondisi tubuh dan mendukung kebutuhan anjing pada setiap tahap hidup.",
    sections: [
      { heading: "Kenali kebutuhan individual", body: "Anak anjing, anjing dewasa, senior, anjing aktif, dan anjing dengan kondisi medis memiliki kebutuhan yang berbeda." },
      { heading: "Pantau kondisi tubuh", body: "Berat saja tidak selalu cukup. Tanyakan penilaian kondisi tubuh kepada dokter dan sesuaikan porsi berdasarkan perkembangan, aktivitas, serta petunjuk profesional." },
      { heading: "Hindari perubahan tanpa rencana", body: "Lakukan transisi pakan secara bertahap dan catat perubahan nafsu makan, feses, kulit, serta energi." },
    ],
    faq: [{ question: "Berapa kali anjing harus makan?", answer: "Frekuensi bergantung pada usia, ukuran, kondisi kesehatan, dan rutinitas. Ikuti rekomendasi dokter serta panduan pakan yang sesuai." }],
  },
  {
    slug: "persiapan-grooming-pertama",
    title: "Persiapan Grooming Pertama agar Anabul Lebih Nyaman",
    description: "Siapkan informasi kesehatan, perilaku, dan kebutuhan grooming agar sesi pertama lebih aman dan nyaman.",
    category: "Perawatan", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 5,
    intro: "Pengalaman grooming dipengaruhi kondisi kesehatan, kebiasaan disentuh, lingkungan, dan cara penanganan pet.",
    sections: [
      { heading: "Berikan informasi yang jujur", body: "Sampaikan kondisi kulit, alergi, luka, penyakit, pengalaman grooming, serta respons pet terhadap orang atau hewan lain." },
      { heading: "Pilih layanan yang diperlukan", body: "Tidak semua pet membutuhkan paket yang sama. Diskusikan mandi, pengeringan, sisir, potong kuku, telinga, atau kebutuhan bulu secara terpisah." },
      { heading: "Pantau setelah pulang", body: "Periksa kulit, telinga, kuku, perilaku, dan tanda tidak nyaman. Hubungi penyedia layanan atau dokter bila ada masalah." },
    ],
    faq: [{ question: "Apakah pet perlu makan sebelum grooming?", answer: "Tanyakan kebijakan groomer. Hindari porsi besar tepat sebelum perjalanan atau sesi bila pet mudah mual, kecuali ada arahan khusus." }],
  },
  {
    slug: "checklist-memilih-pet-hotel",
    title: "Checklist Memilih Pet Hotel dan Penitipan Hewan",
    description: "Hal yang perlu diperiksa sebelum memilih penitipan kucing, anjing, atau pet lainnya.",
    category: "Pet Lifestyle", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 6,
    intro: "Pet hotel yang cocok bukan hanya dekat. Kebersihan, keamanan, pengawasan, protokol kesehatan, dan kemampuan merespons keadaan darurat sama pentingnya.",
    sections: [
      { heading: "Tinjau fasilitas", body: "Periksa ventilasi, suhu, kebersihan, pemisahan hewan, keamanan kandang atau kamar, area aktivitas, dan pengawasan." },
      { heading: "Tanyakan protokol kesehatan", body: "Pahami persyaratan vaksin, skrining, pencegahan parasit, penanganan pet sakit, isolasi, serta rujukan darurat." },
      { heading: "Siapkan kebutuhan pet", body: "Berikan instruksi makan, obat, perilaku, kontak darurat, dan barang yang diizinkan dengan label jelas." },
    ],
    faq: [{ question: "Perlukah trial sebelum menginap lama?", answer: "Untuk sebagian pet, kunjungan singkat dapat membantu menilai adaptasi. Diskusikan pilihan ini dengan fasilitas dan pertimbangkan karakter pet." }],
  },
  {
    slug: "persiapan-adopsi-anabul",
    title: "Persiapan Sebelum Adopsi Anabul",
    description: "Evaluasi waktu, biaya, tempat tinggal, dan komitmen keluarga sebelum mengadopsi hewan.",
    category: "Adopsi", reviewedBy: "Tim Edukasi Slivadoc", updatedAt: "2026-08-28", readMinutes: 6,
    intro: "Adopsi yang bertanggung jawab dimulai sebelum pet datang. Pastikan kebutuhan spesies, biaya, waktu, dan lingkungan sesuai untuk jangka panjang.",
    sections: [
      { heading: "Hitung komitmen jangka panjang", body: "Pertimbangkan makanan, kesehatan rutin, kondisi darurat, grooming, pelatihan, penitipan, serta perubahan hidup di masa depan." },
      { heading: "Siapkan rumah", body: "Amankan benda berbahaya, siapkan area tenang, makanan, air, tempat istirahat, toilet atau area buang, serta transportasi yang aman." },
      { heading: "Rencanakan masa adaptasi", body: "Berikan rutinitas konsisten dan pengenalan bertahap kepada orang, hewan, serta ruang baru." },
    ],
    faq: [{ question: "Berapa lama pet beradaptasi setelah adopsi?", answer: "Waktunya berbeda pada setiap hewan. Hindari memaksa interaksi dan cari bantuan profesional bila stres berat atau masalah perilaku berlanjut." }],
  },
];

export const cityPages: CityPage[] = [
  { slug: "jakarta-barat", name: "Jakarta Barat", province: "DKI Jakarta", description: "Temukan layanan pet care, dokter hewan, pet clinic, petshop, grooming, dan penitipan hewan di Jakarta Barat.", intro: "Dari kawasan permukiman hingga pusat aktivitas, pet parent Jakarta Barat dapat menelusuri layanan berdasarkan jarak, kategori, dan kebutuhan pet melalui Slivadoc.", nearbyAreas: ["Kebon Jeruk", "Palmerah", "Kembangan", "Cengkareng", "Grogol Petamburan", "Kalideres"] },
  { slug: "jakarta-selatan", name: "Jakarta Selatan", province: "DKI Jakarta", description: "Cari dokter hewan, pet clinic, petshop, grooming, dan pet hotel di Jakarta Selatan melalui Slivadoc.", intro: "Gunakan pencarian Slivadoc untuk membandingkan layanan hewan di berbagai area Jakarta Selatan dan menyimpan aktivitas perawatan dalam satu akun.", nearbyAreas: ["Kebayoran Baru", "Cilandak", "Pasar Minggu", "Tebet", "Setiabudi", "Pancoran"] },
  { slug: "jakarta-timur", name: "Jakarta Timur", province: "DKI Jakarta", description: "Jelajahi layanan kesehatan dan kebutuhan hewan di Jakarta Timur berdasarkan lokasi dan kategori.", intro: "Cari layanan di sekitar Jakarta Timur, periksa informasi yang ditampilkan mitra, dan tentukan pilihan sesuai kebutuhan serta kondisi pet.", nearbyAreas: ["Duren Sawit", "Cakung", "Jatinegara", "Kramat Jati", "Pasar Rebo", "Cipayung"] },
  { slug: "jakarta-utara", name: "Jakarta Utara", province: "DKI Jakarta", description: "Temukan pet clinic, petshop, grooming, pet hotel, dan dokter hewan di Jakarta Utara.", intro: "Slivadoc menghubungkan pencarian lokasi dengan profil layanan agar pet parent Jakarta Utara dapat merencanakan perawatan lebih mudah.", nearbyAreas: ["Kelapa Gading", "Penjaringan", "Tanjung Priok", "Pademangan", "Koja", "Cilincing"] },
  { slug: "jakarta-pusat", name: "Jakarta Pusat", province: "DKI Jakarta", description: "Cari layanan pet care dan dokter hewan di Jakarta Pusat dalam ekosistem Slivadoc.", intro: "Temukan layanan di area Jakarta Pusat, mulai dari kebutuhan rutin hingga fasilitas kesehatan, dengan pencarian yang dapat disesuaikan.", nearbyAreas: ["Menteng", "Tanah Abang", "Kemayoran", "Senen", "Cempaka Putih", "Gambir"] },
  { slug: "tangerang", name: "Tangerang", province: "Banten", description: "Temukan dokter hewan, pet clinic, petshop, grooming, dan penitipan hewan di Tangerang.", intro: "Jelajahi pilihan pet care di Tangerang berdasarkan area, kategori, dan informasi mitra yang tersedia di Slivadoc.", nearbyAreas: ["Karawaci", "Ciledug", "Cipondoh", "Pinang", "Batuceper", "Tangerang Selatan"] },
  { slug: "bekasi", name: "Bekasi", province: "Jawa Barat", description: "Cari layanan hewan, dokter hewan, petshop, pet clinic, grooming, dan pet hotel di Bekasi.", intro: "Slivadoc membantu pet parent Bekasi menemukan layanan yang relevan dan mengelola booking serta aktivitas pet dalam satu ekosistem.", nearbyAreas: ["Bekasi Barat", "Bekasi Selatan", "Bekasi Timur", "Bekasi Utara", "Jatiasih", "Pondok Gede"] },
  { slug: "bandung", name: "Bandung", province: "Jawa Barat", description: "Jelajahi dokter hewan, pet clinic, petshop, grooming, dan layanan pet care di Bandung.", intro: "Telusuri layanan hewan di Bandung dan area sekitarnya dengan filter kategori serta lokasi melalui Slivadoc.", nearbyAreas: ["Coblong", "Sukajadi", "Lengkong", "Antapani", "Buahbatu", "Cimahi"] },
  { slug: "surabaya", name: "Surabaya", province: "Jawa Timur", description: "Temukan layanan pet care, klinik hewan, dokter hewan, petshop, dan grooming di Surabaya.", intro: "Cari layanan anabul di berbagai wilayah Surabaya dan cocokkan pilihan dengan kebutuhan, lokasi, serta informasi mitra.", nearbyAreas: ["Surabaya Barat", "Surabaya Timur", "Surabaya Selatan", "Surabaya Utara", "Surabaya Pusat", "Sidoarjo"] },
  { slug: "denpasar", name: "Denpasar", province: "Bali", description: "Cari dokter hewan, pet clinic, petshop, grooming, dan kebutuhan pet di Denpasar serta area Bali terdekat.", intro: "Slivadoc membantu pet parent dan pengunjung di Denpasar menelusuri layanan hewan berdasarkan kategori serta lokasi.", nearbyAreas: ["Denpasar Barat", "Denpasar Selatan", "Denpasar Timur", "Denpasar Utara", "Kuta", "Badung"] },
];

export const serviceBySlug = new Map(servicePages.map((item) => [item.slug, item]));
export const guideBySlug = new Map(guidePages.map((item) => [item.slug, item]));
export const cityBySlug = new Map(cityPages.map((item) => [item.slug, item]));
