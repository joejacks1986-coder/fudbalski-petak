export type Igrac = {
  id: number;
  ime: string;
  nadimak: string;
  opis: string;
  slika?: string;
};

export const igraci: Igrac[] = [
  {
    id: 1,
    ime: "Miloš Ilić",
    nadimak: "Kuvar",
    opis: "Komanduje odbranom. Viče, grdi. Uglavnom početna tačka napada svoje ekipe. Tačan na pasu, oštar na kritikama i uvek spreman da podeli 'Žute kartone' kada neko propusti termin bez dobrog razloga.",
    slika: "/igraci/kuvar.png"
  },
  {
    id: 2,
    ime: "Stefan Momirović",
    nadimak: "Momir",
    opis: "Stabilan u odbrani, glavni u napadu. Zalama i levom i desnom. Preko njega ide većina napada njegove ekipe. Uvek je za fer podelu ekipa uz napomenu 'Da bude dobar fudbal!'.",
    slika: "/igraci/moma.jpg"
  },
  {
    id: 3,
    ime: "Veljko Ilić",
    nadimak: "Velja",
    opis: "Lucidnost u mislima ostavlja na Viber grupi, dok je na terenu neumoran i disciplinovan. Maksimalno ispunjava defanzivne zadatke, a u ofanzivi podiže formu svakog petka.",
    slika: "/igraci/velja.jpg"
  },
  {
    id: 4,
    ime: "Miloš Miličić",
    nadimak: "Vučko",
    opis: "Stub odbrane svoje ekipe. Voli jak duel i da levom zavrne lažnjak ka sredini terena. Uživa u duelima sa Janijem gde je uvek dodatno motivisan.",
    slika: "/igraci/vucko.jpg"
  },
  {
    id: 5,
    ime: "Dragan Milosavljević",
    nadimak: "Zet",
    opis: "Možda i najveći 'trkač' termina. Uvek u 5. brzini, ali kad mu je lopta u nogama voli da je nagazi i ispreskače kao komšijsku tarabu.",
    slika: "/igraci/zet.jpg"
  },
  {
    id: 6,
    ime: "Vladimir Janković",
    nadimak: "Jani",
    opis: "Večita enigma ovog termina. Vidi se da je posedovao magiju u nogama, ali ga je poročni život udaljio od nekadašnje forme. Svi na terminu se nadaju da će ga jednom videti u nekadašnjem sjaju.",
    slika: "/igraci/jani.jpg"
  },
  {
    id: 7,
    ime: "Miljan Đukanović",
    nadimak: "Miljan",
    opis: "Fudbalski maštar. Već na početku termina zamišlja Joga Bonito poteze. Više voli da postigne jedan lep nego 10 regularnih golova. Idejni tvorac i začetnik ove hronike. Sa nestrpljenjem se subotom ujutru čeka njegov izveštaj sa termina.",
    slika: "/igraci/placeholder.png"
  },
  {
    id: 9,
    ime: "Miloš Ševarika",
    nadimak: "Šeki",
    opis: "Nekada vihorno levo krilo, sada igrač koji ide do kraja na svaku loptu, pa zbog toga često izlazi sa termina kao sa bojnog polja.",
    slika: "/igraci/seki.jpg"
  },
  {
    id: 10,
    ime: "Petar Banićević",
    nadimak: "Peđa",
    opis: "Nepredvidiv kao vremenska prognoza. Ili će da pljusne kiša golova ili će sa gol linije promašivati kao da je zaglavio u snegu do kolena. Ne voli defanzivu kao žedan igrač toplo pivo!",
    slika: "/igraci/pedja.jpg"
  },
  {
    id: 16,
    ime: "Marko Krsmanović",
    nadimak: "Krsma",
    opis: "Veteran fudbalske igre koji i dalje igra kao da mu je 20. Stabilan na lopti, okretan u driblingu i uvek spreman da pruži maksimum.",
    slika: "/igraci/krsma.jpg"
  },
  {
    id: 11,
    ime: "Miloš Đorđević",
    nadimak: "Đemba",
    opis: "Fudbalska teška kategorija. U napadu poput sidraša, dok kada je među stativama voli da svojim potezima diže puls saigračima.",
    slika: "/igraci/djemba.jpg"
  },
  {
    id: 12,
    ime: "Milan Đurić",
    nadimak: "Đuka",
    opis: "Veliki zvezdaš. Za nešto ređe dolaske na termin krivimo uglavnom sportiste Crvene zvezde koji nas sabotiraju igranjem u istom terminu, što kod Đuke apsolutno ne izaziva dilemu na koju će stranu pre otići. Pouzdan na lopti, siguran u polju. Igrač od kojeg uvek znaš šta da očekuješ.",
    slika: "/igraci/djura.jpg"
  },
  {
    id: 13,
    ime: "Aleksandar Lazičić",
    nadimak: "Lazeka",
    opis: "Trofej za najbolje brkove termina uvek ide u ruke našeg Smederevca. Voli da stane na gol i da tačnim pasovima buši protivničku odbranu.",
    slika: "/igraci/lazeka.jpg"
  },
  {
    id: 14,
    ime: "Jovan Jakšić",
    nadimak: "Coja",
    opis: "Nekada pouzdani kreator igre, koji je nakon povreda i viška kilograma shvatio da više nije za igru u polju, pa se preselio na gol liniju.",
    slika: "/igraci/coja.jpg"
  },
  {
    id: 15,
    ime: "Darko Lukić",
    nadimak: "Dare",
    opis: "Priča se po gradu da je smrt za žene! Dovoljan opis. Fudbal je u drugom planu!",
    slika: "/igraci/dare.jpg"
  },
  
  {
    id: 17,
    ime: "Miloš Trninić",
    nadimak: "Trna",
    opis: "Jedini i dalje aktivni fudbaler među nama. Baš iz tog razloga uvek pravi prevagu na terminu. Brži, spremniji i tehnički potkovaniji od većine nas, pa je uglavnom udvojen na terenu.",
    slika: "/igraci/trna.jpg"
  },
  {
    id: 19,
    ime: "Miloš Stanimirović",
    nadimak: "Stanimir",
    opis: "Duge noge, brz trk i agilnost uvek na zavidnom nivou. Pritisak mu ide na 300 kada pored sebe ima igrače koji ne trče i ne daju 100%.",
    slika: "/igraci/placeholder.png"
  },
  {
    id: 20,
    ime: "Vladimir Škorc",
    nadimak: "Škorc",
    opis: "Levonogi dribler koji pravi razliku. Igra 'školski' i precizno, što je uvek na ceni na zelenom petoparcu. Zbog brojnih povreda, sve ga ređe viđamo na terenu.",
    slika: "/igraci/placeholder.png"
  },
  {
    id: 18,
    ime: "Dušan Mitrović",
    nadimak: "Dule",
    opis: "'Honorable mention'. Entuzijasta koji je došao na ideju da nekadašnje okršaje iz Majdana oživimo i okupio nas ponovo na zelenom petoparcu. Nažalost, već duže vreme ne igra.",
    slika: "/igraci/dule.jpg"
  },
];
