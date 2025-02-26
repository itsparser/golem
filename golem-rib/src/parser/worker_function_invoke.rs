use crate::call_type::CallType;
use crate::parser::identifier::identifier;
use crate::parser::rib_expr::rib_expr;
use crate::parser::RibParseError;
use crate::rib_source_span::GetSourcePosition;
use crate::Expr;
use combine::parser::char::{char, spaces};
use combine::{ParseError, Parser};

pub fn worker_function_invoke<Input>() -> impl Parser<Input, Output = Expr>
where
    Input: combine::Stream<Token = char>,
    RibParseError: Into<
        <Input::Error as ParseError<Input::Token, Input::Range, Input::Position>>::StreamError,
    >,
    Input::Position: GetSourcePosition,
{
    (identifier().skip(spaces()), char('.'), rib_expr())
        .and_then(|(worker_variable, _, call)| match call {
            Expr::Call {
                call_type: CallType::Function { function_name, .. },
                generic_type_parameter,
                args,
                source_span,
                ..
            } => {
                let function_name = function_name.to_string();

                let worker_variable_with_source_span =
                    worker_variable.with_source_span(source_span.clone());

                Ok(Expr::invoke_worker_function(
                    worker_variable_with_source_span,
                    function_name,
                    generic_type_parameter,
                    args,
                )
                .with_source_span(source_span))
            }
            _ => Err(RibParseError::Message("Invalid function call".to_string())),
        })
        .message("Invalid function call")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::generic_type_parameter::GenericTypeParameter;
    use crate::DynamicParsedFunctionName;
    use test_r::test;

    #[test]
    fn test_worker_function_invoke_1() {
        let expr = Expr::from_text("worker.function-name()").unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let function_name = "function-name".to_string();

        assert_eq!(
            expr,
            Expr::invoke_worker_function(worker_variable, function_name, None, vec![])
        );
    }

    #[test]
    fn test_worker_function_invoke_2() {
        let expr = Expr::from_text("worker.function-name[foo]()").unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let function_name = "function-name".to_string();
        let type_parameter = GenericTypeParameter {
            value: "foo".to_string(),
        };

        assert_eq!(
            expr,
            Expr::invoke_worker_function(
                worker_variable,
                function_name,
                Some(type_parameter),
                vec![]
            )
        );
    }

    #[test]
    fn test_worker_function_invoke_3() {
        let expr = Expr::from_text(r#"worker.function-name[foo](foo, bar)"#).unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let type_parameter = GenericTypeParameter {
            value: "foo".to_string(),
        };
        let function_name = "function-name".to_string();

        assert_eq!(
            expr,
            Expr::invoke_worker_function(
                worker_variable,
                function_name,
                Some(type_parameter),
                vec![
                    Expr::identifier_global("foo", None),
                    Expr::identifier_global("bar", None)
                ]
            )
        );
    }

    #[test]
    fn test_worker_function_invoke_4() {
        let expr = Expr::from_text(r#"worker.function-name(foo, bar)"#).unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let function_name = "function-name".to_string();

        assert_eq!(
            expr,
            Expr::invoke_worker_function(
                worker_variable,
                function_name,
                None,
                vec![
                    Expr::identifier_global("foo", None),
                    Expr::identifier_global("bar", None)
                ]
            )
        );
    }

    #[test]
    fn test_worker_function_invoke_5() {
        let rib_expr = r#"
          let worker = instance("my-worker");
          worker.function-name(foo, bar, baz)
        "#;
        let expr = Expr::from_text(rib_expr).unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let function_name = "function-name".to_string();

        let expected = Expr::expr_block(vec![
            Expr::let_binding(
                "worker",
                Expr::call_worker_function(
                    DynamicParsedFunctionName::parse("instance").unwrap(),
                    None,
                    None,
                    vec![Expr::literal("my-worker")],
                ),
                None,
            ),
            Expr::invoke_worker_function(
                worker_variable,
                function_name,
                None,
                vec![
                    Expr::identifier_global("foo", None),
                    Expr::identifier_global("bar", None),
                    Expr::identifier_global("baz", None),
                ],
            ),
        ]);
        assert_eq!(expr, expected);
    }

    #[test]
    fn test_worker_function_invoke_6() {
        let rib_expr = r#"
          let worker = instance("my-worker");
          worker.function-name[foo](foo, bar, baz)
        "#;
        let expr = Expr::from_text(rib_expr).unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let function_name = "function-name".to_string();
        let type_parameter = GenericTypeParameter {
            value: "foo".to_string(),
        };

        let expected = Expr::expr_block(vec![
            Expr::let_binding(
                "worker",
                Expr::call_worker_function(
                    DynamicParsedFunctionName::parse("instance").unwrap(),
                    None,
                    None,
                    vec![Expr::literal("my-worker")],
                ),
                None,
            ),
            Expr::invoke_worker_function(
                worker_variable,
                function_name,
                Some(type_parameter),
                vec![
                    Expr::identifier_global("foo", None),
                    Expr::identifier_global("bar", None),
                    Expr::identifier_global("baz", None),
                ],
            ),
        ]);
        assert_eq!(expr, expected);
    }

    #[test]
    fn test_worker_function_invoke_7() {
        let rib_expr = r#"
          let worker = instance[foo]("my-worker");
          worker.function-name[bar](foo, bar, baz)
        "#;
        let expr = Expr::from_text(rib_expr).unwrap();
        let worker_variable = Expr::identifier_global("worker", None);
        let function_name = "function-name".to_string();
        let type_parameter1 = GenericTypeParameter {
            value: "foo".to_string(),
        };

        let type_parameter2 = GenericTypeParameter {
            value: "bar".to_string(),
        };

        let expected = Expr::expr_block(vec![
            Expr::let_binding(
                "worker",
                Expr::call_worker_function(
                    DynamicParsedFunctionName::parse("instance").unwrap(),
                    Some(type_parameter1),
                    None,
                    vec![Expr::literal("my-worker")],
                ),
                None,
            ),
            Expr::invoke_worker_function(
                worker_variable,
                function_name,
                Some(type_parameter2),
                vec![
                    Expr::identifier_global("foo", None),
                    Expr::identifier_global("bar", None),
                    Expr::identifier_global("baz", None),
                ],
            ),
        ]);
        assert_eq!(expr, expected);
    }
}
