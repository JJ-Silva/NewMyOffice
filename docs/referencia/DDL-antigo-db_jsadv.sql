-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema db_jsadv
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema db_jsadv
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `db_jsadv` DEFAULT CHARACTER SET utf8 ;
USE `db_jsadv` ;

-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Cliente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Cliente` (
  `ID_Cliente` INT NOT NULL AUTO_INCREMENT,
  `Nome_Cliente` VARCHAR(250) NOT NULL,
  `CPF_CNPJ_Cliente` VARCHAR(18) NOT NULL,
  `Data_Cadastro_Cliente` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Cliente`),
  UNIQUE INDEX `CPF_CNPJ_Cliente_UNIQUE` (`CPF_CNPJ_Cliente` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Cliente_Email`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Cliente_Email` (
  `ID_Email_Cliente` INT NOT NULL AUTO_INCREMENT,
  `Email_Cliente` VARCHAR(250) NOT NULL,
  `ID_Cliente` INT NOT NULL,
  PRIMARY KEY (`ID_Email_Cliente`),
  INDEX `fk_TB_CLIENTE_EMAIL_TB_CLIENTE_idx` (`ID_Cliente` ASC) VISIBLE,
  UNIQUE INDEX `Email_Cliente_UNIQUE` (`Email_Cliente` ASC) VISIBLE,
  CONSTRAINT `fk_TB_CLIENTE_EMAIL_TB_CLIENTE`
    FOREIGN KEY (`ID_Cliente`)
    REFERENCES `db_jsadv`.`TB_Cliente` (`ID_Cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Cliente_Telefone`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Cliente_Telefone` (
  `ID_Telefone_Cliente` INT NOT NULL AUTO_INCREMENT,
  `Numero_Telefone_Cliente` VARCHAR(45) NOT NULL,
  `WathsApp` TINYINT NOT NULL,
  `ID_Cliente` INT NOT NULL,
  PRIMARY KEY (`ID_Telefone_Cliente`),
  INDEX `fk_TB_CLIENTE_TELEFONE_TB_CLIENTE1_idx` (`ID_Cliente` ASC) VISIBLE,
  UNIQUE INDEX `Numero_Telefone_Cliente_UNIQUE` (`Numero_Telefone_Cliente` ASC) VISIBLE,
  CONSTRAINT `fk_TB_CLIENTE_TELEFONE_TB_CLIENTE1`
    FOREIGN KEY (`ID_Cliente`)
    REFERENCES `db_jsadv`.`TB_Cliente` (`ID_Cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Cliente_Endereco`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Cliente_Endereco` (
  `ID_Endereco_Cliente` INT NOT NULL AUTO_INCREMENT,
  `CEP_Endereco_Cliente` VARCHAR(10) NULL,
  `logradouro_Endereco_Cliente` VARCHAR(250) NOT NULL,
  `Número_Endereco_Cliente` INT NOT NULL,
  `Complemento_Endereco_Cliente` VARCHAR(200) NULL,
  `Cidadade_Endereco_Cliente` VARCHAR(100) NOT NULL,
  `Bairro_Endereco_Cliente` VARCHAR(100) NOT NULL,
  `UF_Endereco_Cliente` VARCHAR(2) NOT NULL,
  PRIMARY KEY (`ID_Endereco_Cliente`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`HAS_Cliente_Endereco`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`HAS_Cliente_Endereco` (
  `ID_Cliente_Endereco` INT NOT NULL,
  `ID_Cliente` INT NOT NULL,
  PRIMARY KEY (`ID_Cliente_Endereco`, `ID_Cliente`),
  INDEX `fk_TB_CLIENTE_ENDERECO_has_TB_CLIENTE_TB_CLIENTE1_idx` (`ID_Cliente` ASC) VISIBLE,
  INDEX `fk_TB_CLIENTE_ENDERECO_has_TB_CLIENTE_TB_CLIENTE_ENDERECO1_idx` (`ID_Cliente_Endereco` ASC) VISIBLE,
  CONSTRAINT `fk_TB_CLIENTE_ENDERECO_has_TB_CLIENTE_TB_CLIENTE_ENDERECO1`
    FOREIGN KEY (`ID_Cliente_Endereco`)
    REFERENCES `db_jsadv`.`TB_Cliente_Endereco` (`ID_Endereco_Cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_CLIENTE_ENDERECO_has_TB_CLIENTE_TB_CLIENTE1`
    FOREIGN KEY (`ID_Cliente`)
    REFERENCES `db_jsadv`.`TB_Cliente` (`ID_Cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Pasta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Pasta` (
  `ID_Pasta` INT NOT NULL AUTO_INCREMENT,
  `Data_Cadastro_Pasta` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Nome_Pasta` VARCHAR(30) NOT NULL,
  `Objetivo_Pasta` VARCHAR(100) NOT NULL,
  `Objeto_Pasta` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`ID_Pasta`),
  UNIQUE INDEX `Nome_Pasta_UNIQUE` (`Nome_Pasta` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`HAS_Pasta_Cliente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`HAS_Pasta_Cliente` (
  `ID_Cliente` INT NOT NULL,
  `ID_Pasta` INT NOT NULL,
  PRIMARY KEY (`ID_Cliente`, `ID_Pasta`),
  INDEX `fk_TB_CLIENTE_has_TB_Pasta_TB_Pasta1_idx` (`ID_Pasta` ASC) VISIBLE,
  INDEX `fk_TB_CLIENTE_has_TB_Pasta_TB_CLIENTE1_idx` (`ID_Cliente` ASC) VISIBLE,
  CONSTRAINT `fk_TB_CLIENTE_has_TB_Pasta_TB_CLIENTE1`
    FOREIGN KEY (`ID_Cliente`)
    REFERENCES `db_jsadv`.`TB_Cliente` (`ID_Cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_CLIENTE_has_TB_Pasta_TB_Pasta1`
    FOREIGN KEY (`ID_Pasta`)
    REFERENCES `db_jsadv`.`TB_Pasta` (`ID_Pasta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Tratamento`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Tratamento` (
  `ID_Tratamento` INT NOT NULL AUTO_INCREMENT,
  `Tratamento` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`ID_Tratamento`),
  UNIQUE INDEX `Tratamento_UNIQUE` (`Tratamento` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Equipe`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Equipe` (
  `ID_Equipe` INT NOT NULL AUTO_INCREMENT,
  `Nome_Equipe` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`ID_Equipe`),
  UNIQUE INDEX `Nome_Equipe_UNIQUE` (`Nome_Equipe` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Processo_Judicial`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Processo_Judicial` (
  `ID_Processo_Judicial` INT NOT NULL AUTO_INCREMENT,
  `ID_Pasta` INT NOT NULL,
  `Justica` VARCHAR(45) NULL,
  `Vara` VARCHAR(45) NULL,
  `Ação` VARCHAR(45) NULL,
  `Cliente_Polo_Ativo` TINYINT NOT NULL,
  PRIMARY KEY (`ID_Processo_Judicial`),
  INDEX `fk_TB_PROCESSO_JUDICIAL_TB_PASTA1_idx` (`ID_Pasta` ASC) VISIBLE,
  CONSTRAINT `fk_TB_PROCESSO_JUDICIAL_TB_PASTA1`
    FOREIGN KEY (`ID_Pasta`)
    REFERENCES `db_jsadv`.`TB_Pasta` (`ID_Pasta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Processo_Administrativo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Processo_Administrativo` (
  `ID_Processo_Administrativo` INT NOT NULL AUTO_INCREMENT,
  `Num_Processo_Administrativo` VARCHAR(45) NOT NULL,
  `ID_Pasta` INT NOT NULL,
  PRIMARY KEY (`ID_Processo_Administrativo`),
  INDEX `fk_TB_PROCESSO_ADM_TB_PASTA1_idx` (`ID_Pasta` ASC) VISIBLE,
  UNIQUE INDEX `Num_Processo_Administrativo_UNIQUE` (`Num_Processo_Administrativo` ASC) VISIBLE,
  CONSTRAINT `fk_TB_PROCESSO_ADM_TB_PASTA1`
    FOREIGN KEY (`ID_Pasta`)
    REFERENCES `db_jsadv`.`TB_Pasta` (`ID_Pasta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Atividade`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Atividade` (
  `ID_Atividade` INT NOT NULL,
  `ID_Pasta` INT NOT NULL,
  `ID_Processo_Judicial` INT NULL,
  `ID_Processo_Administrativo` INT NULL,
  `Data_Cadastro_Atividade` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Data_Inicio_Atividade` DATE NOT NULL,
  `Dias_Atividade` TINYINT NOT NULL,
  `Prazo_Atividade` DATE NOT NULL,
  `Prazo_Fatal_Atividade` DATE NOT NULL,
  `Data_Conclusao_Atividade` DATE NULL,
  `ID_Tratamento` INT NOT NULL,
  `ID_Equipe` INT NOT NULL,
  `ID_Configuracao_Contagem` INT NOT NULL,
  PRIMARY KEY (`ID_Atividade`),
  INDEX `fk_TB_ATIVIDADE_TB_PASTA1_idx` (`ID_Pasta` ASC) VISIBLE,
  INDEX `fk_TB_ATIVIDADE_TB_TRATAMENTO1_idx` (`ID_Tratamento` ASC) VISIBLE,
  INDEX `fk_TB_ATIVIDADE_TB_EQUIPE1_idx` (`ID_Equipe` ASC) VISIBLE,
  INDEX `fk_TB_ATIVIDADE_TB_PROCESSO_JUDICIAL1_idx` (`ID_Processo_Judicial` ASC) VISIBLE,
  INDEX `fk_TB_ATIVIDADE_TB_PROCESSO_ADM1_idx` (`ID_Processo_Administrativo` ASC) VISIBLE,
  CONSTRAINT `fk_TB_ATIVIDADE_TB_PASTA1`
    FOREIGN KEY (`ID_Pasta`)
    REFERENCES `db_jsadv`.`TB_Pasta` (`ID_Pasta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_ATIVIDADE_TB_TRATAMENTO1`
    FOREIGN KEY (`ID_Tratamento`)
    REFERENCES `db_jsadv`.`TB_Tratamento` (`ID_Tratamento`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_ATIVIDADE_TB_EQUIPE1`
    FOREIGN KEY (`ID_Equipe`)
    REFERENCES `db_jsadv`.`TB_Equipe` (`ID_Equipe`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_ATIVIDADE_TB_PROCESSO_JUDICIAL1`
    FOREIGN KEY (`ID_Processo_Judicial`)
    REFERENCES `db_jsadv`.`TB_Processo_Judicial` (`ID_Processo_Judicial`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_ATIVIDADE_TB_PROCESSO_ADM1`
    FOREIGN KEY (`ID_Processo_Administrativo`)
    REFERENCES `db_jsadv`.`TB_Processo_Administrativo` (`ID_Processo_Administrativo`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_User`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_User` (
  `ID_User` INT NOT NULL AUTO_INCREMENT,
  `Name_User` VARCHAR(250) NOT NULL,
  `Login_User` VARCHAR(100) NOT NULL,
  `Hash_Senha` VARCHAR(250) NOT NULL,
  PRIMARY KEY (`ID_User`),
  UNIQUE INDEX `Login_User_UNIQUE` (`Login_User` ASC) VISIBLE,
  UNIQUE INDEX `Hash_Senha_UNIQUE` (`Hash_Senha` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`HAS_User_Equipe`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`HAS_User_Equipe` (
  `ID_User` INT NOT NULL,
  `ID_Equipe` INT NOT NULL,
  PRIMARY KEY (`ID_User`, `ID_Equipe`),
  INDEX `fk_TB_USER_has_TB_EQUIPE_TB_EQUIPE1_idx` (`ID_Equipe` ASC) VISIBLE,
  INDEX `fk_TB_USER_has_TB_EQUIPE_TB_USER1_idx` (`ID_User` ASC) VISIBLE,
  CONSTRAINT `fk_TB_USER_has_TB_EQUIPE_TB_USER1`
    FOREIGN KEY (`ID_User`)
    REFERENCES `db_jsadv`.`TB_User` (`ID_User`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_TB_USER_has_TB_EQUIPE_TB_EQUIPE1`
    FOREIGN KEY (`ID_Equipe`)
    REFERENCES `db_jsadv`.`TB_Equipe` (`ID_Equipe`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Polo_Oposto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Polo_Oposto` (
  `ID_Polo_Oposto` INT NOT NULL AUTO_INCREMENT,
  `Nome_Polo_Oposto` VARCHAR(250) NOT NULL,
  `ID_Pasta` INT NOT NULL,
  PRIMARY KEY (`ID_Polo_Oposto`),
  INDEX `fk_TB_POLO_OPOSTO_TB_PASTA1_idx` (`ID_Pasta` ASC) VISIBLE,
  CONSTRAINT `fk_TB_POLO_OPOSTO_TB_PASTA1`
    FOREIGN KEY (`ID_Pasta`)
    REFERENCES `db_jsadv`.`TB_Pasta` (`ID_Pasta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Observacao`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Observacao` (
  `ID_Observacao` INT NOT NULL AUTO_INCREMENT,
  `Observacao` VARCHAR(250) NOT NULL,
  `ID_Atividade` INT NOT NULL,
  PRIMARY KEY (`ID_Observacao`),
  INDEX `fk_TB_Observacao_TB_ATIVIDADE1_idx` (`ID_Atividade` ASC) VISIBLE,
  CONSTRAINT `fk_TB_Observacao_TB_ATIVIDADE1`
    FOREIGN KEY (`ID_Atividade`)
    REFERENCES `db_jsadv`.`TB_Atividade` (`ID_Atividade`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `db_jsadv`.`TB_Configuracao_Contagem`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `db_jsadv`.`TB_Configuracao_Contagem` (
  `ID_Configuracao_Contagem` INT NOT NULL AUTO_INCREMENT,
  `Dias_Uteis` TINYINT NOT NULL,
  `Prazo_Dobrado` TINYINT NOT NULL,
  `Excluir_Feriados` TINYINT NOT NULL,
  PRIMARY KEY (`ID_Configuracao_Contagem`))
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
