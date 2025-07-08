-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 01, 2025 at 09:00 AM
-- Server version: 8.0.30
-- PHP Version: 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `digitaldetective`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `generate_case_solution` (IN `p_case_id` INT, IN `p_user_id` INT)   BEGIN
    DECLARE v_culprit_id INT;
    DECLARE v_weapon_id INT;
    DECLARE v_weapon_location INT;
    DECLARE v_crime_scene INT;
    
    -- Seleciona um culpado aleatório entre os suspeitos do caso
    SELECT suspect_id INTO v_culprit_id
    FROM caso_suspect
    WHERE case_id = p_case_id
    ORDER BY RAND()
    LIMIT 1;
    
    -- Seleciona uma arma aleatória entre as disponíveis no caso
    SELECT weapon_id INTO v_weapon_id
    FROM arma
    WHERE weapon_id IN (
        SELECT weapon_id FROM case_weapon WHERE case_id = p_case_id
    )
    ORDER BY RAND()
    LIMIT 1;
    
    -- Encontra a localização da cena do crime
    SELECT location_id INTO v_crime_scene
    FROM local 
    WHERE is_crime_scene = 1 AND location_id IN (
        SELECT location_id FROM case_location WHERE case_id = p_case_id
    )
    LIMIT 1;
    
    -- Seleciona um local aleatório para esconder a arma (não pode ser a cena do crime)
    SELECT location_id INTO v_weapon_location
    FROM case_location
    WHERE case_id = p_case_id AND location_id != v_crime_scene
    ORDER BY RAND()
    LIMIT 1;
    
    -- Reseta todas as armas do caso
    UPDATE case_weapon
    SET murder_weapon = 0
    WHERE case_id = p_case_id;
    
    -- Define a arma do crime
    UPDATE case_weapon
    SET murder_weapon = 1, found_at_location_id = v_weapon_location, is_hidden = 1
    WHERE case_id = p_case_id AND weapon_id = v_weapon_id;
    
    -- Registra a solução do jogo
    INSERT INTO game_solution (case_id, user_id, culprit_id, weapon_id)
    VALUES (p_case_id, p_user_id, v_culprit_id, v_weapon_id);
    
    -- Atualiza a descrição da solução no caso
    UPDATE casos
    SET solution = CONCAT('O assassino foi ', (SELECT name FROM suspeitos WHERE suspect_id = v_culprit_id), 
        ', que usou ', (SELECT name FROM arma WHERE weapon_id = v_weapon_id), 
        ' para cometer o crime.')
    WHERE case_id = p_case_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `reset_case` (IN `p_case_id` INT, IN `p_user_id` INT)   BEGIN
    -- Remove o progresso do usuário
    DELETE FROM user_progress WHERE user_id = p_user_id AND case_id = p_case_id;
    
    -- Remove a solução anterior
    DELETE FROM game_solution WHERE user_id = p_user_id AND case_id = p_case_id;
    
    -- Gera uma nova solução
    CALL generate_case_solution(p_case_id, p_user_id);
    
    -- Reseta o status das armas
    UPDATE case_weapon SET murder_weapon = 0 WHERE case_id = p_case_id;
    
    -- Inicia novo progresso para o usuário
    INSERT INTO user_progress (user_id, case_id, current_location_id)
    VALUES (p_user_id, p_case_id, 
           (SELECT location_id FROM local WHERE name = (SELECT starting_location FROM casos WHERE case_id = p_case_id) LIMIT 1));
END$$

--
-- Functions
--
CREATE DEFINER=`root`@`localhost` FUNCTION `is_culprit` (`p_suspect_id` INT, `p_user_id` INT) RETURNS TINYINT(1) DETERMINISTIC BEGIN
    DECLARE v_result BOOLEAN;
    
    SELECT COUNT(*) > 0 INTO v_result
    FROM game_solution gs
    JOIN user_progress up ON gs.case_id = up.case_id
    WHERE up.user_id = p_user_id
    AND gs.culprit_id = p_suspect_id;
    
    RETURN v_result;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `arma`
--

CREATE TABLE `arma` (
  `weapon_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `type` enum('Fogo','Branca','Contundente','Outros') NOT NULL,
  `description` text,
  `inspection_message` text,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `arma`
--

INSERT INTO `arma` (`weapon_id`, `name`, `type`, `description`, `inspection_message`, `image`) VALUES
(1, 'Estatueta de Bronze', 'Contundente', 'Pesado prêmio de caça da coleção', 'A estatueta está limpa, mas há marcas de sangue recentes na base.', 'estatueta.jpg'),
(2, 'Veneno de Digitalis', 'Outros', 'Medicamento cardíaco em dose letal', 'O frasco está quase vazio. Uma dose grande o suficiente para ser fatal.', 'veneno.jpg'),
(3, 'Adaga Antiga', 'Branca', 'Peça da coleção de armas', 'A lâmina está limpa, mas há vestígios de sangue no cabo.', 'adaga.jpg'),
(4, 'Corda de Seda', 'Outros', 'Corda de cortinas pesadas', 'Parece ter sido cortada recentemente, com marcas de força aplicada.', 'corda.jpg'),
(5, 'Pistola Antiga', 'Fogo', 'Revólver da coleção', 'A arma não foi disparada recentemente, mas está faltando uma bala.', 'pistola.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `assistentes`
--

CREATE TABLE `assistentes` (
  `assistente_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `habilidade_especial` varchar(100) NOT NULL,
  `desvantagem` varchar(100) NOT NULL,
  `imagem` varchar(100) DEFAULT 'default_assistant.png',
  `dialogo_padrao` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `assistentes`
--

INSERT INTO `assistentes` (`assistente_id`, `name`, `description`, `habilidade_especial`, `desvantagem`, `imagem`, `dialogo_padrao`) VALUES
(1, 'Rico Belmont', 'Herdeiro preguiçoso, mas com conexões de alto nível', 'Suborna autoridades por informações', 'Policiais não cooperam', 'rico.png', 'Deixa comigo, tenho contatos que podem ajudar... por um preço.'),
(2, 'Clara Maia', 'Mãe dedicada, com um olhar humano sobre o caso', 'Consegue empatia da viúva Isabela', 'Pistas podem atrasar por imprevistos', 'clara.png', 'Vou tentar entender o lado humano dessa história...'),
(3, 'Bárbara Hacker', 'Ex-criminosa que sabe fuçar onde não deve', 'Acessa e-mails apagados do delegado', 'Atrai atenção da polícia', 'barbara.png', 'Hackear sistemas? Relaxa, já fiz coisa pior.'),
(4, 'Dona Lurdes', 'Fofoqueira que sabe tudo sobre a cidade', 'Descobre fofocas cruciais sobre os suspeitos', 'Análise lenta de provas', 'lurdes.png', 'Quer saber a verdade? Eu sei tudo sobre essa gente...'),
(5, 'Dra. Ice', 'Psicóloga que analisa perfis e manipula diálogos', 'Convence suspeitos a confessarem', 'Irrita suspeitos com perguntas invasivas', 'ice.png', 'Analisando o perfil... eles têm padrões comportamentais interessantes.');

-- --------------------------------------------------------

--
-- Table structure for table `case_clue`
--

CREATE TABLE `case_clue` (
  `case_id` int NOT NULL,
  `clue_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `suspect_id` int DEFAULT NULL,
  `is_hidden` tinyint(1) DEFAULT '0',
  `required_dialogue` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `case_clue`
--

INSERT INTO `case_clue` (`case_id`, `clue_id`, `location_id`, `suspect_id`, `is_hidden`, `required_dialogue`) VALUES
(1, 1, 5, 1, 0, NULL),
(1, 2, 4, 2, 1, NULL),
(1, 3, 5, 3, 0, NULL),
(1, 4, NULL, 4, 0, NULL),
(1, 5, 7, 5, 0, NULL),
(1, 6, 2, 6, 1, NULL),
(1, 7, NULL, NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `case_location`
--

CREATE TABLE `case_location` (
  `case_id` int NOT NULL,
  `location_id` int NOT NULL,
  `custom_description` text,
  `visit_order` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `case_location`
--

INSERT INTO `case_location` (`case_id`, `location_id`, `custom_description`, `visit_order`) VALUES
(1, 1, NULL, 1),
(1, 2, NULL, 2),
(1, 3, NULL, 3),
(1, 4, NULL, 4),
(1, 5, NULL, 5),
(1, 6, NULL, 6),
(1, 7, NULL, 7);

-- --------------------------------------------------------

--
-- Table structure for table `case_weapon`
--

CREATE TABLE `case_weapon` (
  `case_id` int NOT NULL,
  `weapon_id` int NOT NULL,
  `found_at_location_id` int DEFAULT NULL,
  `is_hidden` tinyint(1) DEFAULT '0',
  `murder_weapon` tinyint(1) DEFAULT '0',
  `custom_description` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `case_weapon`
--

INSERT INTO `case_weapon` (`case_id`, `weapon_id`, `found_at_location_id`, `is_hidden`, `murder_weapon`, `custom_description`) VALUES
(1, 1, NULL, 0, 0, NULL),
(1, 2, NULL, 0, 0, NULL),
(1, 3, NULL, 0, 0, NULL),
(1, 4, NULL, 0, 0, NULL),
(1, 5, NULL, 0, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `casos`
--

CREATE TABLE `casos` (
  `case_id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `victim_name` varchar(100) NOT NULL,
  `victim_age` int NOT NULL,
  `victim_description` text NOT NULL,
  `crime_scene` text NOT NULL,
  `starting_location` varchar(100) NOT NULL,
  `difficulty` enum('Fácil','Médio','Difícil') NOT NULL,
  `is_solved` tinyint(1) DEFAULT '0',
  `solution` text,
  `start_message` text NOT NULL,
  `year_setting` int NOT NULL,
  `theme_color` varchar(7) DEFAULT '#242424'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `casos`
--

INSERT INTO `casos` (`case_id`, `title`, `description`, `victim_name`, `victim_age`, `victim_description`, `crime_scene`, `starting_location`, `difficulty`, `is_solved`, `solution`, `start_message`, `year_setting`, `theme_color`) VALUES
(1, 'O Mistério da Mansão Blackwood', 'Lord Edmund Blackwood foi encontrado morto em seu escritório durante uma tempestade que isolou a mansão. O assassino está entre os presentes.', 'Edmund Blackwood', 48, 'Colecionador obcecado por artefatos egípcios. Conhecido por ser manipulativo e guardar segredos familiares.', 'Escritório revirado com sinais de luta. Uma estátua de Anúbis está no local do crime.', 'Salão Principal', 'Difícil', 0, 'Solução padrão - será substituída pela aleatória', 'A noite cai sobre a Mansão Blackwood enquanto a tempestade rage lá fora. O corpo de Lord Blackwood foi encontrado em seu escritório... e você está encarregado de desvendar este mistério.', 2000, '#242424');

-- --------------------------------------------------------

--
-- Table structure for table `caso_suspect`
--

CREATE TABLE `caso_suspect` (
  `case_id` int NOT NULL,
  `suspect_id` int NOT NULL,
  `relationship_to_victim` varchar(100) DEFAULT NULL,
  `custom_alibi` text,
  `custom_motive` text,
  `custom_attitude` enum('hostil','neutro','amigavel') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `caso_suspect`
--

INSERT INTO `caso_suspect` (`case_id`, `suspect_id`, `relationship_to_victim`, `custom_alibi`, `custom_motive`, `custom_attitude`) VALUES
(1, 1, 'Esposa', NULL, 'Edmund planejava deserdá-la', NULL),
(1, 2, 'Filho e herdeiro', NULL, 'Dívidas de jogo com a máfia', NULL),
(1, 3, 'Médica pessoal', NULL, 'Edmund descobriu seu esquema de venda de remédios', NULL),
(1, 4, 'Mordomo', NULL, 'Edmund descobriu que roubava artefatos', NULL),
(1, 5, 'Secretária', NULL, 'Edmund a rejeitou romanticamente e ameaçou demiti-la', NULL),
(1, 6, 'Advogado', NULL, 'Edmund descobriu desvio de fundos', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `dialogos`
--

CREATE TABLE `dialogos` (
  `dialogo_id` int NOT NULL,
  `case_id` int NOT NULL,
  `suspect_id` int DEFAULT NULL,
  `assistente_id` int DEFAULT NULL,
  `fala` text NOT NULL,
  `tipo` enum('npc','jogador','sistema') NOT NULL,
  `id_proxima_fala` int DEFAULT NULL,
  `trigger_type` enum('auto','pista','local','arma','assistente') DEFAULT NULL,
  `trigger_id` int DEFAULT NULL,
  `min_attitude` int DEFAULT '0',
  `audio_file` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `dialogos`
--

INSERT INTO `dialogos` (`dialogo_id`, `case_id`, `suspect_id`, `assistente_id`, `fala`, `tipo`, `id_proxima_fala`, `trigger_type`, `trigger_id`, `min_attitude`, `audio_file`) VALUES
(1, 1, 1, NULL, 'Oh, detetive... que alívio que você está aqui!', 'npc', 2, NULL, NULL, 0, NULL),
(2, 1, 1, NULL, 'Meu pobre Edmund... quem faria isso com ele?', 'npc', NULL, NULL, NULL, 0, NULL),
(3, 1, NULL, NULL, 'Onde você estava quando aconteceu?', 'jogador', 4, NULL, NULL, 0, NULL),
(4, 1, 1, NULL, 'Estava no jardim de inverno, lendo. James me trouxe chá por volta das 9h.', 'npc', NULL, NULL, NULL, 0, NULL),
(5, 1, NULL, NULL, 'Soube que seu marido planejava mudar o testamento...', 'jogador', 6, 'pista', 6, 0, NULL),
(6, 1, 1, NULL, 'Isso é ridículo! Nossa relação era perfeita!', 'npc', NULL, NULL, NULL, 0, NULL),
(7, 1, NULL, NULL, 'Você sabia sobre as dívidas de jogo do Victor?', 'jogador', 8, 'pista', 2, 0, NULL),
(8, 1, 1, NULL, 'Eu... eu suspeitava, mas Edmund insistia em ajudá-lo.', 'npc', NULL, NULL, NULL, 0, NULL),
(20, 1, NULL, NULL, 'Onde você estava na hora do crime?', 'jogador', 21, NULL, NULL, 0, NULL),
(21, 1, NULL, NULL, 'Eu estava... [resposta padrão será substituída]', 'npc', NULL, NULL, NULL, 0, NULL),
(22, 1, NULL, NULL, 'Você tinha algum motivo para querer Lord Blackwood morto?', 'jogador', 23, NULL, NULL, 0, NULL),
(23, 1, NULL, NULL, 'Absolutamente não! [resposta padrão]', 'npc', NULL, NULL, NULL, 0, NULL),
(24, 1, NULL, NULL, 'Você conhece essa arma?', 'jogador', 25, NULL, NULL, 0, NULL),
(25, 1, NULL, NULL, 'Não, nunca vi antes. [resposta padrão]', 'npc', NULL, NULL, NULL, 0, NULL),
(100, 1, NULL, 1, 'Detetive, consegui uma informação exclusiva... mas custou uma grana.', 'npc', NULL, 'auto', NULL, 0, NULL),
(101, 1, NULL, 2, 'A viúva parece estar escondendo algo... vou tentar conversar com ela.', 'npc', NULL, 'auto', NULL, 0, NULL),
(102, 1, NULL, 3, 'Hackeei os e-mails do Victor... tem coisa estranha aqui.', 'npc', NULL, 'auto', NULL, 0, NULL),
(103, 1, NULL, 4, 'Todo mundo aqui tem segredo, até aquele mordomo...', 'npc', NULL, 'auto', NULL, 0, NULL),
(104, 1, NULL, 5, 'Analisando os suspeitos... o perfil do assassino é fascinante.', 'npc', NULL, 'auto', NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `emails`
--

CREATE TABLE `emails` (
  `email_id` int NOT NULL,
  `case_id` int NOT NULL,
  `sender_id` int DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `sent_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) DEFAULT '0',
  `requires_reply` tinyint(1) DEFAULT '0',
  `reply_options` json DEFAULT NULL,
  `trigger_condition` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `escolhas_dialogo`
--

CREATE TABLE `escolhas_dialogo` (
  `escolha_id` int NOT NULL,
  `dialogo_origem` int NOT NULL,
  `texto_escolha` varchar(255) NOT NULL,
  `dialogo_destino` int NOT NULL,
  `revela_pista` int DEFAULT NULL,
  `requer_pista` int DEFAULT NULL,
  `requer_arma` int DEFAULT NULL,
  `altera_relacao` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `escolhas_dialogo`
--

INSERT INTO `escolhas_dialogo` (`escolha_id`, `dialogo_origem`, `texto_escolha`, `dialogo_destino`, `revela_pista`, `requer_pista`, `requer_arma`, `altera_relacao`) VALUES
(1, 2, 'Perguntar sobre o alibi', 3, NULL, NULL, NULL, 0),
(2, 2, 'Questionar sobre o testamento', 5, NULL, 6, NULL, -1),
(3, 2, 'Perguntar sobre Victor', 7, NULL, 2, NULL, 0),
(4, 4, 'Pedir mais detalhes sobre o alibi', 20, 1, NULL, NULL, 0),
(5, 2, 'Perguntar sobre o alibi', 20, NULL, NULL, NULL, 0),
(6, 2, 'Questionar sobre motivos', 22, NULL, NULL, NULL, -1),
(7, 2, 'Mostrar arma do crime', 24, NULL, NULL, NULL, -2);

-- --------------------------------------------------------

--
-- Table structure for table `game_solution`
--

CREATE TABLE `game_solution` (
  `game_id` int NOT NULL,
  `case_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `culprit_id` int NOT NULL,
  `weapon_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `resolution_type` enum('justica','culpado_incorreto','detetive_morto') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `local`
--

CREATE TABLE `local` (
  `location_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_crime_scene` tinyint(1) DEFAULT '0',
  `initial_inspection` text,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `local`
--

INSERT INTO `local` (`location_id`, `name`, `description`, `is_crime_scene`, `initial_inspection`, `image`) VALUES
(1, 'Salão Principal', 'Grande salão de entrada da mansão com escadaria de mármore e lustres de cristal.', 0, 'O salão principal está silencioso, com apenas o som da chuva batendo nas janelas.', 'salon.jpg'),
(2, 'Escritório de Lord Blackwood', 'Elegante escritório com móveis de carvalho e uma grande escrivaninha.', 1, 'O corpo de Lord Blackwood está caído sobre a escrivaninha. Há sinais de uma luta breve.', 'escritorio.jpg'),
(3, 'Jardim de Inverno', 'Área envidraçada com plantas exóticas e um pequeno lago ornamental.', 0, 'O jardim de inverno oferece uma vista tranquila, em contraste com o caos dentro da mansão.', 'jardim.jpg'),
(4, 'Biblioteca', 'Extensa coleção de livros raros em estantes que chegam até o teto.', 0, 'O cheiro de livros antigos preenche o ar. Algumas obras parecem ter sido consultadas recentemente.', 'biblioteca.jpg'),
(5, 'Quarto de Hóspedes', 'Quarto luxuoso no segundo andar, decorado com bom gosto.', 0, 'O quarto parece ter sido ocupado recentemente. Há objetos pessoais sobre a cômoda.', 'quarto.jpg'),
(6, 'Cozinha', 'Cozinha profissional equipada com utensílios de aço inoxidável.', 0, 'O aroma de comida recentemente preparada ainda paira no ar.', 'cozinha.jpg'),
(7, 'Salão de Arte', 'Galeria com valiosas pinturas e esculturas coletadas pela família.', 0, 'As obras de arte observam silenciosamente, testemunhas mudas do crime.', 'arte.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `noticias`
--

CREATE TABLE `noticias` (
  `news_id` int NOT NULL,
  `case_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `trigger_condition` varchar(100) DEFAULT NULL,
  `trigger_value` varchar(100) DEFAULT NULL,
  `publish_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pista`
--

CREATE TABLE `pista` (
  `clue_id` int NOT NULL,
  `description` text NOT NULL,
  `importance` enum('Baixa','Média','Alta') NOT NULL,
  `is_red_herring` tinyint(1) DEFAULT '0',
  `inspection_message` text,
  `found_message` text,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pista`
--

INSERT INTO `pista` (`clue_id`, `description`, `importance`, `is_red_herring`, `inspection_message`, `found_message`, `image`) VALUES
(1, 'Luvas de jardinagem com terra', 'Média', 0, 'As luvas têm terra fresca, como se tivessem sido usadas recentemente no jardim.', 'Encontradas no quarto de hóspedes, mas Helena disse estar no jardim de inverno', 'luvas.jpg'),
(2, 'Documentos sobre dívidas de jogo', 'Alta', 0, 'Os documentos mostram que Victor Blackwood tinha grandes dívidas com cassinos.', 'Encontrados escondidos atrás de um quadro na biblioteca', 'dividas.jpg'),
(3, 'Frasco de digitalis quase vazio', 'Alta', 0, 'O frasco de medicamento está quase vazio, com apenas alguns resíduos no fundo.', 'Encontrado na mala médica da Dra. Whitmore', 'frasco.jpg'),
(4, 'Chave mestra do escritório', 'Média', 1, 'James afirma que sempre carrega esta chave para suas funções.', 'Encontrada no bolso do mordomo', 'chave.jpg'),
(5, 'Carta de demissão não enviada', 'Média', 0, 'A carta está datada de ontem, mas não foi enviada. Isabelle parece relutante em deixar o emprego.', 'Encontrada na mesa da secretária', 'carta.jpg'),
(6, 'Rascunho do novo testamento', 'Alta', 0, 'O documento mostra mudanças significativas na distribuição da herança.', 'Encontrado na gaveta do advogado', 'testamento.jpg'),
(7, 'Manchas de cera vermelha', 'Baixa', 1, 'Provavelmente de velas decorativas, sem relação com o crime.', 'Encontradas no corredor do segundo andar', 'cera.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `suspeitos`
--

CREATE TABLE `suspeitos` (
  `suspect_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `age` int DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `appearance` text,
  `personality` text,
  `initial_attitude` enum('hostil','neutro','amigavel') DEFAULT 'neutro',
  `default_alibi` text,
  `default_motive` text,
  `foto` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `suspeitos`
--

INSERT INTO `suspeitos` (`suspect_id`, `name`, `age`, `occupation`, `appearance`, `personality`, `initial_attitude`, `default_alibi`, `default_motive`, `foto`) VALUES
(1, 'Helena Blackwood', 40, 'Esposa de Lord Blackwood', 'Vestido elegante, joias caras', 'Nervosa, defensiva, tenta desviar suspeitas', 'neutro', 'No jardim de inverno lendo', 'Edmund planejava mudar o testamento', 'helena.jpg'),
(2, 'Victor Blackwood', 42, 'Filho e herdeiro', 'Terno escuro, semblante sério', 'Arrogante, impaciente, hostil quando pressionado', 'hostil', 'Na biblioteca consultando livros', 'Problemas financeiros graves', 'victor.jpg'),
(3, 'Dr. Margaret Whitmore', 55, 'Médica da família', 'Aspecto profissional, óculos', 'Calma, analítica, usa jargão médico para confundir', 'amigavel', 'Organizando maleta médica no quarto', 'Edmund descobriu venda ilegal de remédios', 'margaret.jpg'),
(4, 'James Morton', 50, 'Mordomo', 'Traje formal impecável', 'Respeitoso mas evasivo, conhece todos os segredos', 'neutro', 'Na cozinha preparando chá', 'Edmund descobriu roubo de objetos', 'james.jpg'),
(5, 'Isabelle Crane', 28, 'Secretária', 'Vestido moderno, postura confiante', 'Inteligente, manipuladora, flerta sutilmente', 'amigavel', 'Catalogando peças no salão de arte', 'Rejeição romântica e ameaça de demissão', 'isabelle.jpg'),
(6, 'Charles Vanderbilt', 60, 'Advogado da família', 'Terno conservador, maleta de couro', 'Reservado, calculista, evita contato visual', 'hostil', 'Revisando documentos no escritório', 'Conflito sobre mudanças no testamento', 'charles.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `user_emails`
--

CREATE TABLE `user_emails` (
  `user_email_id` int NOT NULL,
  `user_id` int NOT NULL,
  `email_id` int NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `replied` tinyint(1) DEFAULT '0',
  `reply_content` text,
  `received_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_progress`
--

CREATE TABLE `user_progress` (
  `progress_id` int NOT NULL,
  `user_id` int NOT NULL,
  `case_id` int NOT NULL,
  `assistente_id` int DEFAULT NULL,
  `clues_found` json DEFAULT NULL,
  `suspects_interviewed` json DEFAULT NULL,
  `locations_visited` json DEFAULT NULL,
  `weapons_inspected` json DEFAULT NULL,
  `current_location_id` int DEFAULT NULL,
  `dialogos_realizados` json DEFAULT NULL,
  `suspect_attitudes` json DEFAULT NULL,
  `notes_content` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

CREATE TABLE `usuarios` (
  `user_id` int NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `current_case_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `arma`
--
ALTER TABLE `arma`
  ADD PRIMARY KEY (`weapon_id`);

--
-- Indexes for table `assistentes`
--
ALTER TABLE `assistentes`
  ADD PRIMARY KEY (`assistente_id`);

--
-- Indexes for table `case_clue`
--
ALTER TABLE `case_clue`
  ADD PRIMARY KEY (`case_id`,`clue_id`),
  ADD KEY `location_id` (`location_id`),
  ADD KEY `suspect_id` (`suspect_id`),
  ADD KEY `clue_id` (`clue_id`);

--
-- Indexes for table `case_location`
--
ALTER TABLE `case_location`
  ADD PRIMARY KEY (`case_id`,`location_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Indexes for table `case_weapon`
--
ALTER TABLE `case_weapon`
  ADD PRIMARY KEY (`case_id`,`weapon_id`),
  ADD KEY `weapon_id` (`weapon_id`),
  ADD KEY `found_at_location_id` (`found_at_location_id`);

--
-- Indexes for table `casos`
--
ALTER TABLE `casos`
  ADD PRIMARY KEY (`case_id`);

--
-- Indexes for table `caso_suspect`
--
ALTER TABLE `caso_suspect`
  ADD PRIMARY KEY (`case_id`,`suspect_id`),
  ADD KEY `suspect_id` (`suspect_id`);

--
-- Indexes for table `dialogos`
--
ALTER TABLE `dialogos`
  ADD PRIMARY KEY (`dialogo_id`),
  ADD KEY `case_id` (`case_id`),
  ADD KEY `suspect_id` (`suspect_id`),
  ADD KEY `id_proxima_fala` (`id_proxima_fala`),
  ADD KEY `assistente_id` (`assistente_id`);

--
-- Indexes for table `emails`
--
ALTER TABLE `emails`
  ADD PRIMARY KEY (`email_id`),
  ADD KEY `case_id` (`case_id`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Indexes for table `escolhas_dialogo`
--
ALTER TABLE `escolhas_dialogo`
  ADD PRIMARY KEY (`escolha_id`),
  ADD KEY `dialogo_origem` (`dialogo_origem`),
  ADD KEY `dialogo_destino` (`dialogo_destino`),
  ADD KEY `revela_pista` (`revela_pista`),
  ADD KEY `requer_pista` (`requer_pista`),
  ADD KEY `requer_arma` (`requer_arma`);

--
-- Indexes for table `game_solution`
--
ALTER TABLE `game_solution`
  ADD PRIMARY KEY (`game_id`),
  ADD KEY `case_id` (`case_id`),
  ADD KEY `culprit_id` (`culprit_id`),
  ADD KEY `weapon_id` (`weapon_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `local`
--
ALTER TABLE `local`
  ADD PRIMARY KEY (`location_id`);

--
-- Indexes for table `noticias`
--
ALTER TABLE `noticias`
  ADD PRIMARY KEY (`news_id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `pista`
--
ALTER TABLE `pista`
  ADD PRIMARY KEY (`clue_id`);

--
-- Indexes for table `suspeitos`
--
ALTER TABLE `suspeitos`
  ADD PRIMARY KEY (`suspect_id`);

--
-- Indexes for table `user_emails`
--
ALTER TABLE `user_emails`
  ADD PRIMARY KEY (`user_email_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `email_id` (`email_id`);

--
-- Indexes for table `user_progress`
--
ALTER TABLE `user_progress`
  ADD PRIMARY KEY (`progress_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `case_id` (`case_id`),
  ADD KEY `current_location_id` (`current_location_id`),
  ADD KEY `assistente_id` (`assistente_id`);

--
-- Indexes for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `arma`
--
ALTER TABLE `arma`
  MODIFY `weapon_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `assistentes`
--
ALTER TABLE `assistentes`
  MODIFY `assistente_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `casos`
--
ALTER TABLE `casos`
  MODIFY `case_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `dialogos`
--
ALTER TABLE `dialogos`
  MODIFY `dialogo_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT for table `emails`
--
ALTER TABLE `emails`
  MODIFY `email_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `escolhas_dialogo`
--
ALTER TABLE `escolhas_dialogo`
  MODIFY `escolha_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `game_solution`
--
ALTER TABLE `game_solution`
  MODIFY `game_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `local`
--
ALTER TABLE `local`
  MODIFY `location_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `noticias`
--
ALTER TABLE `noticias`
  MODIFY `news_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pista`
--
ALTER TABLE `pista`
  MODIFY `clue_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `suspeitos`
--
ALTER TABLE `suspeitos`
  MODIFY `suspect_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_emails`
--
ALTER TABLE `user_emails`
  MODIFY `user_email_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_progress`
--
ALTER TABLE `user_progress`
  MODIFY `progress_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `case_clue`
--
ALTER TABLE `case_clue`
  ADD CONSTRAINT `case_clue_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_clue_ibfk_2` FOREIGN KEY (`clue_id`) REFERENCES `pista` (`clue_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_clue_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `local` (`location_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `case_clue_ibfk_4` FOREIGN KEY (`suspect_id`) REFERENCES `suspeitos` (`suspect_id`) ON DELETE SET NULL;

--
-- Constraints for table `case_location`
--
ALTER TABLE `case_location`
  ADD CONSTRAINT `case_location_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_location_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `local` (`location_id`) ON DELETE CASCADE;

--
-- Constraints for table `case_weapon`
--
ALTER TABLE `case_weapon`
  ADD CONSTRAINT `case_weapon_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_weapon_ibfk_2` FOREIGN KEY (`weapon_id`) REFERENCES `arma` (`weapon_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_weapon_ibfk_3` FOREIGN KEY (`found_at_location_id`) REFERENCES `local` (`location_id`) ON DELETE SET NULL;

--
-- Constraints for table `caso_suspect`
--
ALTER TABLE `caso_suspect`
  ADD CONSTRAINT `caso_suspect_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `caso_suspect_ibfk_2` FOREIGN KEY (`suspect_id`) REFERENCES `suspeitos` (`suspect_id`) ON DELETE CASCADE;

--
-- Constraints for table `dialogos`
--
ALTER TABLE `dialogos`
  ADD CONSTRAINT `dialogos_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `dialogos_ibfk_2` FOREIGN KEY (`suspect_id`) REFERENCES `suspeitos` (`suspect_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `dialogos_ibfk_3` FOREIGN KEY (`id_proxima_fala`) REFERENCES `dialogos` (`dialogo_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `dialogos_ibfk_4` FOREIGN KEY (`assistente_id`) REFERENCES `assistentes` (`assistente_id`) ON DELETE SET NULL;

--
-- Constraints for table `emails`
--
ALTER TABLE `emails`
  ADD CONSTRAINT `emails_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `emails_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `suspeitos` (`suspect_id`) ON DELETE SET NULL;

--
-- Constraints for table `escolhas_dialogo`
--
ALTER TABLE `escolhas_dialogo`
  ADD CONSTRAINT `escolhas_dialogo_ibfk_1` FOREIGN KEY (`dialogo_origem`) REFERENCES `dialogos` (`dialogo_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `escolhas_dialogo_ibfk_2` FOREIGN KEY (`dialogo_destino`) REFERENCES `dialogos` (`dialogo_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `escolhas_dialogo_ibfk_3` FOREIGN KEY (`revela_pista`) REFERENCES `pista` (`clue_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `escolhas_dialogo_ibfk_4` FOREIGN KEY (`requer_pista`) REFERENCES `pista` (`clue_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `escolhas_dialogo_ibfk_5` FOREIGN KEY (`requer_arma`) REFERENCES `arma` (`weapon_id`) ON DELETE SET NULL;

--
-- Constraints for table `game_solution`
--
ALTER TABLE `game_solution`
  ADD CONSTRAINT `game_solution_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_solution_ibfk_2` FOREIGN KEY (`culprit_id`) REFERENCES `suspeitos` (`suspect_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_solution_ibfk_3` FOREIGN KEY (`weapon_id`) REFERENCES `arma` (`weapon_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_solution_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `noticias`
--
ALTER TABLE `noticias`
  ADD CONSTRAINT `noticias_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_emails`
--
ALTER TABLE `user_emails`
  ADD CONSTRAINT `user_emails_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_emails_ibfk_2` FOREIGN KEY (`email_id`) REFERENCES `emails` (`email_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_progress`
--
ALTER TABLE `user_progress`
  ADD CONSTRAINT `user_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_progress_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `casos` (`case_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_progress_ibfk_3` FOREIGN KEY (`current_location_id`) REFERENCES `local` (`location_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `user_progress_ibfk_4` FOREIGN KEY (`assistente_id`) REFERENCES `assistentes` (`assistente_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
