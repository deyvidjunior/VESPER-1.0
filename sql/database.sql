CREATE DATABASE IF NOT EXISTS vesper CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vesper;
CREATE TABLE pessoas(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(60) NOT NULL UNIQUE,
  senha_hash VARCHAR(128) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  pergunta_id TINYINT NOT NULL,
  resposta_hash VARCHAR(128) NOT NULL,
  frase_hash VARCHAR(128) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE jardins(
  pessoa_id INT PRIMARY KEY,
  moedas INT DEFAULT 0,
  coracoes INT DEFAULT 0,
  ultimo_bonus DATE NULL,
  ultimo_save DATE NULL,
  tema_manual VARCHAR(20) NULL,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE poesias(
  id INT PRIMARY KEY, titulo VARCHAR(80) NOT NULL, custo INT NOT NULL, verso TEXT NOT NULL
) ENGINE=InnoDB;
CREATE TABLE pessoa_poesias(
  pessoa_id INT NOT NULL, poesia_id INT NOT NULL,
  tipo ENUM('desbloqueada','lida','guardada') NOT NULL,
  PRIMARY KEY(pessoa_id,poesia_id,tipo),
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
  FOREIGN KEY (poesia_id) REFERENCES poesias(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE notas(
  id INT AUTO_INCREMENT PRIMARY KEY,
  pessoa_id INT NOT NULL, data DATE NOT NULL,
  titulo VARCHAR(120), texto TEXT, humor VARCHAR(8),
  fixada TINYINT(1) DEFAULT 0, arcada TINYINT(1) DEFAULT 0,
  criada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  editada_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
  INDEX idx_notas(pessoa_id,data)
) ENGINE=InnoDB;
CREATE TABLE atividade(
  id INT AUTO_INCREMENT PRIMARY KEY,
  pessoa_id INT NOT NULL, ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(30), detalhe VARCHAR(160), valor VARCHAR(30), dispositivo VARCHAR(160),
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
  INDEX idx_ativ(pessoa_id,ts)
) ENGINE=InnoDB;
CREATE TABLE temas_vividos(
  pessoa_id INT NOT NULL, tema VARCHAR(20) NOT NULL,
  PRIMARY KEY(pessoa_id,tema),
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE sessoes(
  id INT AUTO_INCREMENT PRIMARY KEY,
  pessoa_id INT NOT NULL, dispositivo VARCHAR(160), fp_hash VARCHAR(64),
  entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
  INDEX idx_sess(pessoa_id,entrada)
) ENGINE=InnoDB;
INSERT INTO poesias (id,titulo,custo,verso) VALUES
(1,'Força Interior',0,'Mesmo nas tempestades mais frias,\nsua raiz é feita de sol e luz.\nO vento pode até vergar o caule,\nmas jamais apagará a grandeza\nque floresce em seu peito.\n\nVocê não precisa ser forte o tempo todo;\nhá beleza também nas pausas e no silêncio.'),
(2,'Você é Suficiente',5,'Quando o espelho não reflete sua beleza,\nlembre-se: você é perfeita do seu jeito,\núnica, especial, radiante e brilhante.\n\nVocê é suficiente exatamente como é.'),
(3,'Novo Amanhecer',10,'Todo fim é um novo começo,\ntoda noite precede um amanhecer.\nMesmo nos dias mais escuros,\no sol vai voltar a aparecer.'),
(4,'Coragem de Ser',15,'Tenha coragem de ser quem você é,\nmesmo que o mundo tente te moldar.\nSua autenticidade é sua força.'),
(5,'Jardim Interior',20,'Dentro de você existe um jardim,\nonde florescem sonhos e esperança.\nRegue-o com amor e paciência.'),
(6,'Mulher Guerreira',25,'Mulher, você é feita de aço e de flor,\nde lágrimas e risos, de dor e amor.\nLevanta a cabeça, guerreira!'),
(7,'Tempo de Florescer',30,'Tudo tem seu tempo, minha querida,\nnem tudo acontece na hora que a gente quer.\nConfie no processo da vida.'),
(8,'Você Não Está Só',35,'Quando a noite parecer longa demais,\nlembre-se: você nunca está só.\nExiste alguém torcendo pela sua mão.'),
(9,'Renascer',40,'Assim como a fênix renasce das cinzas,\nvocê também pode se reinventar.'),
(10,'Sua Luz Única',50,'Você tem uma luz que ninguém tem,\numa cor que só você pode pintar,\num jeito único de amar.');